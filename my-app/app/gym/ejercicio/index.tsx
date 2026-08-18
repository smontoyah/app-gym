import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  dayOfWeek,
  DAY_NAMES_FULL,
  formatDuration,
  formatLong,
  formatTime,
  isToday,
  minutesBetween,
  todayStr,
} from '@/lib/date';
import { convertWeightInput, type WeightUnit } from '@/lib/units';
import { fetchDayWorkout, saveCardioSession, saveWorkoutSet } from './_lib/actions';
import { saveWeightUnit } from './_lib/unit-prefs';
import { BlockCard } from './_components/block-card';
import { CardioCard } from './_components/cardio-card';
import { PhaseBanner } from './_components/phase-banner';
import { RestTimer, type RestTarget } from './_components/rest-timer';
import type { SetField } from './_components/set-row';
import type {
  DayWorkout,
  ExerciseWithSets,
  SessionWindow,
  SetInput,
  WorkoutBlock,
} from './_lib/types';
import type { AppColorScheme } from '@/constants/theme';

const DEFAULT_REST_SECONDS = 90;

const EMPTY_WORKOUT: DayWorkout = {
  blocks: [],
  cardio: { plan: null, log: null },
  phase: null,
  session: null,
};

function flatten(blocks: WorkoutBlock[]): ExerciseWithSets[] {
  return blocks.flatMap((b) => b.exercises);
}

/** Un bloque está hecho cuando no le queda ninguna serie sin guardar. */
function isBlockDone(block: WorkoutBlock): boolean {
  return block.exercises.every(
    (e) => e.sets_data.length > 0 && e.sets_data.every((st) => st.saved)
  );
}

/** Estira la ventana de la jornada con la hora que devolvió el servidor. */
function extendSession(session: SessionWindow | null, at: string | null): SessionWindow | null {
  if (!at) return session;
  if (!session) return { start: at, end: at };
  const stamp = Date.parse(at);
  return {
    start: stamp < Date.parse(session.start) ? at : session.start,
    end: stamp > Date.parse(session.end) ? at : session.end,
  };
}

/**
 * Descanso que toca después de guardar una serie, según lo prescrito.
 * Dentro de una super serie el siguiente es el compañero de bloque,
 * que es justamente por lo que ese ejercicio tiene `rest_seconds = 0`.
 */
function computeRest(blocks: WorkoutBlock[], exerciseId: string): RestTarget | null {
  const flat = flatten(blocks);
  if (flat.every((e) => e.sets_data.every((s) => s.saved))) return null;

  const current = flat.find((e) => e.exercise_id === exerciseId);
  const block = blocks.find((b) => b.exercises.some((e) => e.exercise_id === exerciseId));
  if (!current || !block) return null;

  const pendingInBlock = block.exercises.filter((e) => e.sets_data.some((s) => !s.saved));
  const index = flat.findIndex((e) => e.exercise_id === exerciseId);

  const next =
    pendingInBlock.find((e) => e.exercise_id !== exerciseId) ??
    pendingInBlock.find((e) => e.exercise_id === exerciseId) ??
    flat.slice(index + 1).find((e) => e.sets_data.some((s) => !s.saved)) ??
    flat.find((e) => e.sets_data.some((s) => !s.saved));

  return {
    startedAt: Date.now(),
    seconds: current.rest_seconds ?? DEFAULT_REST_SECONDS,
    nextLabel: next ? next.exercises.name : 'terminar',
  };
}

/** Aplica un cambio a un ejercicio concreto sin recrear los demás bloques. */
function mapExercise(
  blocks: WorkoutBlock[],
  exerciseId: string,
  fn: (exercise: ExerciseWithSets) => ExerciseWithSets
): WorkoutBlock[] {
  return blocks.map((block) =>
    block.exercises.some((e) => e.exercise_id === exerciseId)
      ? {
          ...block,
          exercises: block.exercises.map((e) => (e.exercise_id === exerciseId ? fn(e) : e)),
        }
      : block
  );
}

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [dateStr, setDateStr] = useState(todayStr);
  const [workout, setWorkout] = useState<DayWorkout>(EMPTY_WORKOUT);
  const [loading, setLoading] = useState(true);
  const [rest, setRest] = useState<RestTarget | null>(null);
  const [lastSaved, setLastSaved] = useState<{ exerciseId: string; at: number } | null>(null);
  const handledSaveRef = useRef<number | null>(null);

  // El descanso se calcula después de que el estado ya tiene la serie marcada
  // como guardada, no dentro del updater (que debe ser puro). El guard por
  // timestamp evita que se reinicie el cronómetro al teclear en otro ejercicio.
  useEffect(() => {
    if (!lastSaved || handledSaveRef.current === lastSaved.at) return;
    handledSaveRef.current = lastSaved.at;
    setRest(computeRest(workout.blocks, lastSaved.exerciseId));
  }, [lastSaved, workout.blocks]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchDayWorkout(dateStr);
    setWorkout(data);
    setLoading(false);
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goToDate = useCallback((next: string) => {
    setRest(null);
    setDateStr(next);
  }, []);

  const handleSaveSets = useCallback(
    async (exerciseId: string, sets: SetInput[], unit: WeightUnit) => {
      const results = await Promise.all(
        sets.map((st) =>
          saveWorkoutSet({
            exerciseId,
            dateStr,
            setNumber: st.setNumber,
            reps: st.reps,
            weight: st.weight,
            unit,
            rpe: st.rpe,
          })
        )
      );
      const saved = sets.filter((_, i) => results[i].success).map((st) => st.setNumber);
      if (saved.length === 0) return;

      setWorkout((prev) => ({
        ...prev,
        blocks: mapExercise(prev.blocks, exerciseId, (exercise) => ({
          ...exercise,
          sets_data: exercise.sets_data.map((st) =>
            saved.includes(st.set_number) ? { ...st, saved: true } : st
          ),
        })),
        session: results.reduce((acc, r) => extendSession(acc, r.loggedAt), prev.session),
      }));
      setLastSaved({ exerciseId, at: Date.now() });
    },
    [dateStr]
  );

  const handleSaveSet = useCallback(
    (exerciseId: string, set: SetInput, unit: WeightUnit) =>
      handleSaveSets(exerciseId, [set], unit),
    [handleSaveSets]
  );

  /**
   * Cambio de unidad de captura: se traduce lo que ya está escrito para que el
   * número coincida con la máquina, sin tocar lo guardado — en la base sigue
   * habiendo los mismos kg y las series guardadas siguen guardadas.
   */
  const handleUnitChange = useCallback((exerciseId: string, unit: WeightUnit) => {
    setWorkout((prev) => ({
      ...prev,
      blocks: mapExercise(prev.blocks, exerciseId, (exercise) =>
        exercise.weightUnit === unit
          ? exercise
          : {
              ...exercise,
              weightUnit: unit,
              sets_data: exercise.sets_data.map((st) => ({
                ...st,
                weight: convertWeightInput(st.weight, exercise.weightUnit, unit),
              })),
            }
      ),
    }));
    saveWeightUnit(exerciseId, unit);
  }, []);

  const handleSetValueChange = useCallback(
    (exerciseId: string, setIndex: number, field: SetField, value: string) => {
      setWorkout((prev) => ({
        ...prev,
        blocks: mapExercise(prev.blocks, exerciseId, (exercise) => ({
          ...exercise,
          sets_data: exercise.sets_data.map((st, i) =>
            i === setIndex ? { ...st, [field]: value, saved: false } : st
          ),
        })),
      }));
    },
    []
  );

  const handleSaveCardio = useCallback(
    async (minutes: string, modality: string | null) => {
      const { success } = await saveCardioSession({ dateStr, minutes, modality });
      if (success) load();
    },
    [dateStr, load]
  );

  const progress = useMemo(() => {
    const flat = flatten(workout.blocks);
    const completed = flat.filter(
      (e) => e.sets_data.length > 0 && e.sets_data.every((st) => st.saved)
    ).length;
    return { completed, total: flat.length };
  }, [workout.blocks]);

  // Lo que toca ahora, arriba: los bloques terminados bajan al final y los
  // pendientes conservan el orden del plan. Es sólo el orden de pintado —
  // `workout.blocks` guarda el orden real, del que depende `computeRest`.
  // El distintivo «en curso» sólo tiene sentido en la jornada de hoy.
  const ordered = useMemo(() => {
    const pending = workout.blocks.filter((b) => !isBlockDone(b));
    const done = workout.blocks.filter(isBlockDone);
    return {
      list: [...pending, ...done],
      currentKey: isToday(dateStr) ? pending[0]?.key ?? null : null,
    };
  }, [workout.blocks, dateStr]);

  const dow = dayOfWeek(dateStr);
  const targetRpe = workout.phase?.rpe_target?.split('/')[0] ?? null;

  const { session } = workout;
  const elapsed = session ? minutesBetween(session.start, session.end) : 0;

  const header = (
    <>
      <View style={s.dateNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => goToDate(addDays(dateStr, -1))}>
          <Text style={s.navBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={s.dateBox}>
          <Text style={s.dateHeader}>{formatLong(dateStr)}</Text>
          {!isToday(dateStr) && (
            <TouchableOpacity onPress={() => goToDate(todayStr())}>
              <Text style={s.todayLink}>Volver a hoy</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.navBtn} onPress={() => goToDate(addDays(dateStr, 1))}>
          <Text style={s.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <PhaseBanner phase={workout.phase} />

      {progress.total > 0 && (
        <View style={s.progressContainer}>
          <View style={s.progressBarBg}>
            <View
              style={[s.progressBarFill, { width: `${(progress.completed / progress.total) * 100}%` }]}
            />
          </View>
          <Text style={s.progressText}>
            {progress.completed} de {progress.total} ejercicios completados
          </Text>
        </View>
      )}

      {session && (
        <Text style={s.sessionText}>
          {elapsed >= 1
            ? `Sesión ${formatTime(session.start)} – ${formatTime(session.end)} · ${formatDuration(elapsed)}`
            : `Sesión iniciada ${formatTime(session.start)}`}
        </Text>
      )}

      <RestTimer target={rest} onStop={() => setRest(null)} />
    </>
  );

  const footer = (
    <>
      <CardioCard cardio={workout.cardio} onSave={handleSaveCardio} />
      {progress.total === 0 && !loading && (
        <View style={s.restDay}>
          <Text style={s.restDayIcon}>🌙</Text>
          <Text style={s.restDayText}>Sin trabajo de fuerza para {DAY_NAMES_FULL[dow]}</Text>
          <Text style={s.restDaySub}>
            {workout.cardio.plan
              ? 'Día de descanso según el plan — sólo cardio.'
              : 'Configurá tu rutina en la pestaña "Rutinas".'}
          </Text>
          {!workout.cardio.plan && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/configuracion')}>
              <Text style={s.emptyBtnText}>Ir a Rutinas</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={s.container}
      contentContainerStyle={s.content}
      data={ordered.list}
      keyExtractor={(block) => block.key}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      renderItem={({ item }) => (
        <BlockCard
          block={item}
          current={item.key === ordered.currentKey}
          targetRpe={targetRpe}
          onSetValueChange={handleSetValueChange}
          onUnitChange={handleUnitChange}
          onSaveSet={handleSaveSet}
          onSaveAllSets={handleSaveSets}
        />
      )}
    />
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    dateNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    navBtnText: { color: c.text, fontSize: 20, fontWeight: '700', lineHeight: 22 },
    dateBox: { flex: 1, alignItems: 'center' },
    dateHeader: { color: c.text, fontSize: 15, fontWeight: '600' },
    todayLink: { color: c.accent, fontSize: 12, marginTop: 2 },
    progressContainer: { marginBottom: 12, alignItems: 'center' },
    progressBarBg: {
      width: '100%',
      height: 6,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressBarFill: { height: '100%', backgroundColor: c.success, borderRadius: 3 },
    progressText: { color: c.textSecondary, fontSize: 13 },
    sessionText: { color: c.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 12 },
    restDay: { alignItems: 'center', paddingVertical: 24 },
    restDayIcon: { fontSize: 40, marginBottom: 10 },
    restDayText: { color: c.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    restDaySub: { color: c.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' },
    emptyBtn: {
      marginTop: 18,
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 28,
    },
    emptyBtnText: { color: c.accentText, fontSize: 15, fontWeight: '700' },
  });

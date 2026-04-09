import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { fetchTodayWorkout, saveWorkoutSet } from './_lib/actions';
import { ExerciseCard } from './_components/exercise-card';
import type { ExerciseWithSets } from './_lib/types';
import type { AppColorScheme } from '@/constants/theme';

const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const RestTimer = memo(function RestTimer({ startedAt }: { startedAt: number | null }) {
  const { colors } = useTheme();
  const s = useMemo(() => restTimerStyles(colors), [colors]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    setSeconds(0);
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (startedAt === null) return null;

  return (
    <View style={s.container}>
      <Text style={s.text}>
        Descanso: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </Text>
    </View>
  );
});

const restTimerStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { backgroundColor: c.surfaceSecondary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center', marginBottom: 12 },
    text: { color: c.textSecondary, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  });

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const today = useMemo(() => new Date(), []);
  const dayOfWeek = today.getDay();
  const dateStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const { data } = await fetchTodayWorkout(dayOfWeek, dateStr);
        setExercises(data);
        setLoading(false);
      })();
    }, [dayOfWeek, dateStr])
  );

  const handleSaveSet = useCallback(async (
    exerciseId: string,
    setNumber: number,
    reps: string,
    weight: string
  ) => {
    const { success } = await saveWorkoutSet({ exerciseId, dateStr, setNumber, reps, weight });
    if (success) {
      setExercises((prev) => {
        const next = prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? {
                ...ex,
                sets_data: ex.sets_data.map((st) =>
                  st.set_number === setNumber ? { ...st, saved: true } : st
                ),
              }
            : ex
        );
        const allDone = next.every((ex) => ex.sets_data.every((st) => st.saved));
        setTimerStartedAt(allDone ? null : Date.now());
        return next;
      });
    }
  }, [dateStr]);

  const handleSaveAllSets = useCallback(async (
    exerciseId: string,
    sets: { setNumber: number; reps: string; weight: string }[]
  ) => {
    const results = await Promise.all(
      sets.map((st) =>
        saveWorkoutSet({
          exerciseId,
          dateStr,
          setNumber: st.setNumber,
          reps: st.reps,
          weight: st.weight,
        })
      )
    );
    const savedSetNumbers = sets
      .filter((_, i) => results[i].success)
      .map((st) => st.setNumber);

    if (savedSetNumbers.length > 0) {
      setExercises((prev) => {
        const next = prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? {
                ...ex,
                sets_data: ex.sets_data.map((st) =>
                  savedSetNumbers.includes(st.set_number)
                    ? { ...st, saved: true }
                    : st
                ),
              }
            : ex
        );
        const allDone = next.every((ex) => ex.sets_data.every((st) => st.saved));
        setTimerStartedAt(allDone ? null : Date.now());
        return next;
      });
    }
  }, [dateStr]);

  const updateSetValue = useCallback((
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets_data: updated[exerciseIndex].sets_data.map((st, i) =>
          i === setIndex ? { ...st, [field]: value, saved: false } : st
        ),
      };
      return updated;
    });
  }, []);

  const sortedExercises = useMemo(() => {
    const indexed = exercises.map((ex, i) => ({ exercise: ex, originalIndex: i }));
    indexed.sort((a, b) => {
      const aDone = a.exercise.sets_data.length > 0 && a.exercise.sets_data.every(s => s.saved);
      const bDone = b.exercise.sets_data.length > 0 && b.exercise.sets_data.every(s => s.saved);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
    return indexed;
  }, [exercises]);

  const progress = useMemo(() => {
    const total = exercises.length;
    const completed = exercises.filter(
      (ex) => ex.sets_data.length > 0 && ex.sets_data.every((s) => s.saved)
    ).length;
    return { completed, total };
  }, [exercises]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>💪</Text>
        <Text style={s.emptyText}>No hay ejercicios para {DAY_NAMES_FULL[dayOfWeek]}</Text>
        <Text style={s.emptySubtext}>Configurá tu rutina en la pestaña "Rutinas"</Text>
        <TouchableOpacity
          style={s.emptyBtn}
          onPress={() => router.push('/(tabs)/configuracion')}
        >
          <Text style={s.emptyBtnText}>Ir a Rutinas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={s.container}
      contentContainerStyle={s.content}
      data={sortedExercises}
      keyExtractor={(item) => item.exercise.id}
      ListHeaderComponent={
        <>
          <Text style={s.dateHeader}>{DAY_NAMES_FULL[dayOfWeek]} {today.getDate()} de {MONTH_NAMES[today.getMonth()]}</Text>
          <View style={s.progressContainer}>
            <View style={s.progressBarBg}>
              <View
                style={[
                  s.progressBarFill,
                  { width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={s.progressText}>
              {progress.completed} de {progress.total} ejercicios completados
            </Text>
          </View>
          <RestTimer startedAt={timerStartedAt} />
        </>
      }
      renderItem={({ item }) => (
        <ExerciseCard
          exercise={item.exercise}
          exerciseIndex={item.originalIndex}
          onSetValueChange={updateSetValue}
          onSaveSet={handleSaveSet}
          onSaveAllSets={handleSaveAllSets}
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
    dateHeader: { color: c.textSecondary, fontSize: 14, marginBottom: 16, textAlign: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: c.text, fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: c.textSecondary, fontSize: 14, marginTop: 8 },
    emptyBtn: { marginTop: 20, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
    emptyBtnText: { color: c.accentText, fontSize: 15, fontWeight: '700' },
    progressContainer: { marginBottom: 16, alignItems: 'center' as const },
    progressBarBg: { width: '100%' as const, height: 6, backgroundColor: c.surfaceSecondary, borderRadius: 3, overflow: 'hidden' as const, marginBottom: 6 },
    progressBarFill: { height: '100%' as const, backgroundColor: c.success, borderRadius: 3 },
    progressText: { color: c.textSecondary, fontSize: 13 },
  });

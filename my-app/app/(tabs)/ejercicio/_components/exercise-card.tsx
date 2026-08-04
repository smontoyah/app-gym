import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { SetRow, type SetField } from './set-row';
import type { ExerciseWithSets } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseCardProps = {
  exercise: ExerciseWithSets;
  /** RPE objetivo de la fase, usado como placeholder. */
  targetRpe: string | null;
  /** Etiqueta dentro de una super serie: 'A1', 'A2'… */
  positionLabel?: string;
  onSetValueChange: (exerciseId: string, setIndex: number, field: SetField, value: string) => void;
  onSaveSet: (exerciseId: string, setNumber: number, reps: string, weight: string, rpe: string) => void;
  onSaveAllSets: (
    exerciseId: string,
    sets: { setNumber: number; reps: string; weight: string; rpe: string }[]
  ) => void;
};

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  targetRpe,
  positionLabel,
  onSetValueChange,
  onSaveSet,
  onSaveAllSets,
}: ExerciseCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const unsavedWithData = useMemo(
    () => exercise.sets_data.filter((st) => !st.saved && st.reps !== '' && st.weight !== ''),
    [exercise.sets_data]
  );

  const done = exercise.sets_data.length > 0 && exercise.sets_data.every((st) => st.saved);

  return (
    <View style={[s.root, done && s.rootDone]}>
      <View style={s.header}>
        <View style={s.titleRow}>
          {positionLabel && (
            <View style={s.positionBadge}>
              <Text style={s.positionText}>{positionLabel}</Text>
            </View>
          )}
          <Text style={s.name}>{exercise.exercises.name}</Text>
        </View>
        <Text style={s.muscle}>{exercise.exercises.muscle_group}</Text>
      </View>

      {/* Prescripción del entrenador, tal cual el PDF */}
      <View style={s.chips}>
        <View style={s.chip}>
          <Text style={s.chipText}>
            {exercise.sets} × {exercise.target_reps ?? '—'}
          </Text>
        </View>
        {exercise.rest_seconds !== null && (
          <View style={s.chip}>
            <Text style={s.chipText}>
              {exercise.rest_seconds === 0 ? 'sin descanso' : `${exercise.rest_seconds}s`}
            </Text>
          </View>
        )}
        {exercise.cadence && (
          <View style={s.chip}>
            <Text style={s.chipText}>cadencia {exercise.cadence}</Text>
          </View>
        )}
      </View>

      {exercise.notes && <Text style={s.notes}>{exercise.notes}</Text>}
      {exercise.suggestion && !done && <Text style={s.suggestion}>{exercise.suggestion}</Text>}

      <View style={s.setsHeader}>
        <Text style={[s.label, s.labelSet]}>#</Text>
        <Text style={s.label}>Reps</Text>
        <Text style={s.label}>Peso (kg)</Text>
        <Text style={[s.label, s.labelRpe]}>RPE</Text>
        <View style={s.labelSpacer} />
      </View>

      {exercise.sets_data.map((set, setIndex) => (
        <SetRow
          key={set.set_number}
          set={set}
          setIndex={setIndex}
          exerciseId={exercise.exercise_id}
          targetReps={exercise.target_reps}
          targetRpe={targetRpe}
          onValueChange={onSetValueChange}
          onSave={onSaveSet}
        />
      ))}

      {unsavedWithData.length > 0 && (
        <TouchableOpacity
          style={s.saveAllBtn}
          onPress={() =>
            onSaveAllSets(
              exercise.exercise_id,
              unsavedWithData.map((st) => ({
                setNumber: st.set_number,
                reps: st.reps,
                weight: st.weight,
                rpe: st.rpe,
              }))
            )
          }
        >
          <Text style={s.saveAllText}>Guardar todas ({unsavedWithData.length})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    root: { gap: 2 },
    rootDone: { opacity: 0.55 },
    header: { marginBottom: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    positionBadge: {
      backgroundColor: c.warning,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    positionText: { color: '#000', fontSize: 11, fontWeight: '900' },
    name: { flex: 1, color: c.text, fontSize: 17, fontWeight: '700' },
    muscle: { color: c.accent, fontSize: 13, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { backgroundColor: c.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    notes: { color: c.warning, fontSize: 12, marginBottom: 8 },
    suggestion: { color: c.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
    setsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
    label: { flex: 1, color: c.textMuted, fontSize: 11, textAlign: 'center' },
    labelSet: { width: 18, flex: 0 },
    labelRpe: { flex: 0.8 },
    labelSpacer: { width: 38 },
    saveAllBtn: { marginTop: 6, backgroundColor: c.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    saveAllText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
  });

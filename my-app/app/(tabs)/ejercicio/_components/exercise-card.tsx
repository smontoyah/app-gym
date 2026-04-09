import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { SetRow } from './set-row';
import type { ExerciseWithSets } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseCardProps = {
  exercise: ExerciseWithSets;
  exerciseIndex: number;
  onSetValueChange: (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) => void;
  onSaveSet: (exerciseId: string, setNumber: number, reps: string, weight: string) => void;
  onSaveAllSets: (exerciseId: string, sets: { setNumber: number; reps: string; weight: string }[]) => void;
};

export const ExerciseCard = memo(function ExerciseCard({ exercise, exerciseIndex, onSetValueChange, onSaveSet, onSaveAllSets }: ExerciseCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const unsavedWithData = useMemo(
    () => exercise.sets_data.filter((st) => !st.saved && st.reps !== '' && st.weight !== ''),
    [exercise.sets_data]
  );

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.name}>{exercise.exercises.name}</Text>
        <Text style={s.muscle}>{exercise.exercises.muscle_group}</Text>
      </View>
      <View style={s.setsHeader}>
        <Text style={s.label}>Serie</Text>
        <Text style={s.label}>Reps</Text>
        <Text style={s.label}>Peso (kg)</Text>
        <Text style={s.label} />
      </View>
      {exercise.sets_data.map((set, setIndex) => (
        <SetRow
          key={set.set_number}
          set={set}
          setIndex={setIndex}
          exerciseIndex={exerciseIndex}
          exerciseId={exercise.exercise_id}
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
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
    header: { marginBottom: 12 },
    name: { color: c.text, fontSize: 18, fontWeight: '700' },
    muscle: { color: c.accent, fontSize: 13, marginTop: 2 },
    setsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
    label: { flex: 1, color: c.textMuted, fontSize: 12, textAlign: 'center' },
    saveAllBtn: { marginTop: 8, backgroundColor: c.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    saveAllText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
  });

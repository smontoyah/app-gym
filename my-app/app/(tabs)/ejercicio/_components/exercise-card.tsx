import { View, Text, StyleSheet } from 'react-native';
import { SetRow } from './set-row';
import type { ExerciseWithSets } from '../_lib/types';

type ExerciseCardProps = {
  exercise: ExerciseWithSets;
  exerciseIndex: number;
  onSetValueChange: (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) => void;
  onSaveSet: (
    exerciseId: string,
    setNumber: number,
    reps: string,
    weight: string
  ) => void;
};

export function ExerciseCard({
  exercise,
  exerciseIndex,
  onSetValueChange,
  onSaveSet,
}: ExerciseCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.exercises.name}</Text>
        <Text style={styles.muscle}>{exercise.exercises.muscle_group}</Text>
      </View>
      <View style={styles.setsHeader}>
        <Text style={styles.label}>Serie</Text>
        <Text style={styles.label}>Reps</Text>
        <Text style={styles.label}>Peso (kg)</Text>
        <Text style={styles.label} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: { marginBottom: 12 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  muscle: { color: '#0a7ea4', fontSize: 13, marginTop: 2 },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  label: { flex: 1, color: '#666', fontSize: 12, textAlign: 'center' },
});

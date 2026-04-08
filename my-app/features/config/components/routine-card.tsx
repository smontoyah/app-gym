import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { RoutineWithExercise } from '@/types/database';

type RoutineCardProps = {
  routine: RoutineWithExercise;
  onUpdateSets: (routineId: string, sets: number) => void;
  onRemove: (routineId: string, exerciseName: string) => void;
};

export function RoutineCard({ routine, onUpdateSets, onRemove }: RoutineCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{routine.exercises.name}</Text>
        <Text style={styles.muscle}>{routine.exercises.muscle_group}</Text>
      </View>
      <View style={styles.setsControl}>
        <TouchableOpacity
          onPress={() => onUpdateSets(routine.id, routine.sets - 1)}
          style={styles.setsBtn}>
          <Text style={styles.setsBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.setsCount}>{routine.sets}</Text>
        <TouchableOpacity
          onPress={() => onUpdateSets(routine.id, routine.sets + 1)}
          style={styles.setsBtn}>
          <Text style={styles.setsBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={() => onRemove(routine.id, routine.exercises.name)}
        style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  muscle: { color: '#0a7ea4', fontSize: 12, marginTop: 2 },
  setsControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setsBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  setsCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: { marginLeft: 12, padding: 4 },
  removeBtnText: { color: '#ff4444', fontSize: 16 },
});

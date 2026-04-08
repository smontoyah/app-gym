import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchRoutinesAndExercises,
  createExercise,
  addExerciseToRoutine,
  updateRoutineSets,
  deleteRoutineEntry,
} from '@/features/config/actions';
import { DaySelector, DAYS } from '@/features/config/components/day-selector';
import { RoutineCard } from '@/features/config/components/routine-card';
import { ExerciseForm } from '@/features/config/components/exercise-form';
import type { Exercise, RoutineWithExercise } from '@/types/database';

export default function ConfigScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [routines, setRoutines] = useState<RoutineWithExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchRoutinesAndExercises(selectedDay);
    setRoutines(result.routines);
    setExercises(result.exercises);
    setLoading(false);
  }, [selectedDay]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCreateExercise = async (name: string, muscleGroup: string) => {
    const { success } = await createExercise(name, muscleGroup);
    if (success) {
      setShowAddExercise(false);
      loadData();
    }
  };

  const handleAddToRoutine = async (exerciseId: string) => {
    await addExerciseToRoutine({
      dayOfWeek: selectedDay,
      exerciseId,
      currentCount: routines.length,
    });
    loadData();
  };

  const handleUpdateSets = async (routineId: string, sets: number) => {
    await updateRoutineSets(routineId, sets);
    loadData();
  };

  const handleRemove = (routineId: string, exerciseName: string) => {
    Alert.alert('Eliminar', `¿Quitar "${exerciseName}" de ${DAYS[selectedDay]}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutineEntry(routineId);
          loadData();
        },
      },
    ]);
  };

  const availableExercises = exercises.filter(
    (e) => !routines.some((r) => r.exercise_id === e.id)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      <Text style={styles.sectionTitle}>Rutina del {DAYS[selectedDay]}</Text>

      {routines.length === 0 && !loading && (
        <Text style={styles.emptyText}>No hay ejercicios para este día</Text>
      )}
      {routines.map((r) => (
        <RoutineCard
          key={r.id}
          routine={r}
          onUpdateSets={handleUpdateSets}
          onRemove={handleRemove}
        />
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Agregar ejercicio</Text>

      {availableExercises.map((e) => (
        <TouchableOpacity
          key={e.id}
          style={styles.addCard}
          onPress={() => handleAddToRoutine(e.id)}>
          <View>
            <Text style={styles.addCardName}>{e.name}</Text>
            <Text style={styles.addCardMuscle}>{e.muscle_group}</Text>
          </View>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      ))}

      <ExerciseForm
        visible={showAddExercise}
        onToggle={() => setShowAddExercise(!showAddExercise)}
        onSubmit={handleCreateExercise}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#666', fontSize: 14, marginBottom: 16 },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  addCardName: { color: '#fff', fontSize: 15 },
  addCardMuscle: { color: '#666', fontSize: 12, marginTop: 2 },
  addIcon: { color: '#0a7ea4', fontSize: 24, fontWeight: '700' },
});

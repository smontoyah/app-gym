import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchTodayWorkout, saveWorkoutSet } from './_lib/actions';
import { ExerciseCard } from './_components/exercise-card';
import type { ExerciseWithSets } from './_lib/types';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function WorkoutScreen() {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateStr = today.toISOString().split('T')[0];

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

  const handleSaveSet = async (
    exerciseId: string,
    setNumber: number,
    reps: string,
    weight: string
  ) => {
    const { success } = await saveWorkoutSet({
      exerciseId,
      dateStr,
      setNumber,
      reps,
      weight,
    });
    if (success) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? {
                ...ex,
                sets_data: ex.sets_data.map((s) =>
                  s.set_number === setNumber ? { ...s, saved: true } : s
                ),
              }
            : ex
        )
      );
    }
  };

  const updateSetValue = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets_data: updated[exerciseIndex].sets_data.map((s, i) =>
          i === setIndex ? { ...s, [field]: value, saved: false } : s
        ),
      };
      return updated;
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>💪</Text>
        <Text style={styles.emptyText}>
          No hay ejercicios para {DAY_NAMES[dayOfWeek]}
        </Text>
        <Text style={styles.emptySubtext}>
          Configurá tu rutina en la pestaña "Rutinas"
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={exercises}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={styles.dateHeader}>
          {DAY_NAMES[dayOfWeek]} — {dateStr}
        </Text>
      }
      renderItem={({ item, index }) => (
        <ExerciseCard
          exercise={item}
          exerciseIndex={index}
          onSetValueChange={updateSetValue}
          onSaveSet={handleSaveSet}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  dateHeader: { color: '#aaa', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#888', fontSize: 14, marginTop: 8 },
});

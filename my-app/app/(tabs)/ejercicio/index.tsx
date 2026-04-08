import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { fetchTodayWorkout, saveWorkoutSet } from './_lib/actions';
import { ExerciseCard } from './_components/exercise-card';
import type { ExerciseWithSets } from './_lib/types';
import type { AppColorScheme } from '@/constants/theme';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const s = createStyles(colors);
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
    const { success } = await saveWorkoutSet({ exerciseId, dateStr, setNumber, reps, weight });
    if (success) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? {
                ...ex,
                sets_data: ex.sets_data.map((st) =>
                  st.set_number === setNumber ? { ...st, saved: true } : st
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
        sets_data: updated[exerciseIndex].sets_data.map((st, i) =>
          i === setIndex ? { ...st, [field]: value, saved: false } : st
        ),
      };
      return updated;
    });
  };

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
        <Text style={s.emptyText}>No hay ejercicios para {DAY_NAMES[dayOfWeek]}</Text>
        <Text style={s.emptySubtext}>Configurá tu rutina en la pestaña "Rutinas"</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={s.container}
      contentContainerStyle={s.content}
      data={exercises}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={s.dateHeader}>{DAY_NAMES[dayOfWeek]} — {dateStr}</Text>
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

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    dateHeader: { color: c.textSecondary, fontSize: 14, marginBottom: 16, textAlign: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: c.text, fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: c.textSecondary, fontSize: 14, marginTop: 8 },
  });

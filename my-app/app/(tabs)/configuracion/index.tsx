import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Keyboard, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoutinesAndExercises,
  createExercise,
  addExerciseToRoutine,
  updateRoutineSets,
  deleteRoutineEntry,
} from './_lib/actions';
import { DaySelector, DAYS } from './_components/day-selector';
import { RoutineCard } from './_components/routine-card';
import { ExerciseForm } from './_components/exercise-form';
import type { Exercise, RoutineWithExercise } from '@/types/database';
import type { AppColorScheme } from '@/constants/theme';

export default function ConfigScreen() {
  const { colors } = useTheme();
  const s = createStyles(colors);
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

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCreateExercise = async (name: string, muscleGroup: string) => {
    const { success } = await createExercise(name, muscleGroup);
    if (success) { setShowAddExercise(false); loadData(); }
  };

  const handleAddToRoutine = async (exerciseId: string) => {
    await addExerciseToRoutine({ dayOfWeek: selectedDay, exerciseId, currentCount: routines.length });
    loadData();
  };

  const handleUpdateSets = async (routineId: string, sets: number) => {
    await updateRoutineSets(routineId, sets);
    loadData();
  };

  const handleRemove = (routineId: string, exerciseName: string) => {
    Alert.alert('Eliminar', `¿Quitar "${exerciseName}" de ${DAYS[selectedDay]}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteRoutineEntry(routineId); loadData(); } },
    ]);
  };

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const availableExercises = exercises.filter((e) => !routines.some((r) => r.exercise_id === e.id));
  const muscleGroups = [...new Set(availableExercises.map((e) => e.muscle_group))].sort();
  const filteredExercises = muscleFilter
    ? availableExercises.filter((e) => e.muscle_group === muscleFilter)
    : availableExercises;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={s.container}
      contentContainerStyle={[s.content, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
      keyboardShouldPersistTaps="handled"
    >
        <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <Text style={s.sectionTitle}>Rutina del {DAYS[selectedDay]}</Text>

        {routines.length === 0 && !loading && (
          <Text style={s.emptyText}>No hay ejercicios para este día</Text>
        )}
        {routines.map((r) => (
          <RoutineCard key={r.id} routine={r} onUpdateSets={handleUpdateSets} onRemove={handleRemove} />
        ))}

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>Agregar ejercicio</Text>
        {muscleGroups.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
            <TouchableOpacity
              style={[s.filterChip, !muscleFilter && s.filterChipActive]}
              onPress={() => setMuscleFilter(null)}
            >
              <Text style={[s.filterChipText, !muscleFilter && s.filterChipTextActive]}>Todos</Text>
            </TouchableOpacity>
            {muscleGroups.map((group) => (
              <TouchableOpacity
                key={group}
                style={[s.filterChip, muscleFilter === group && s.filterChipActive]}
                onPress={() => setMuscleFilter(muscleFilter === group ? null : group)}
              >
                <Text style={[s.filterChipText, muscleFilter === group && s.filterChipTextActive]}>{group}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {filteredExercises.map((e) => (
          <TouchableOpacity key={e.id} style={s.addCard} onPress={() => handleAddToRoutine(e.id)}>
            <View>
              <Text style={s.addCardName}>{e.name}</Text>
              <Text style={s.addCardMuscle}>{e.muscle_group}</Text>
            </View>
            <Text style={s.addIcon}>+</Text>
          </TouchableOpacity>
        ))}

        <ExerciseForm
          visible={showAddExercise}
          onToggle={() => setShowAddExercise(!showAddExercise)}
          onSubmit={handleCreateExercise}
          onInputFocus={scrollToEnd}
        />
      </ScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
    emptyText: { color: c.textMuted, fontSize: 14, marginBottom: 16 },
    filterRow: { marginBottom: 12, flexGrow: 0 },
    filterContent: { gap: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: c.surfaceSecondary },
    filterChipActive: { backgroundColor: c.accent },
    filterChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: c.accentText },
    addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
    addCardName: { color: c.text, fontSize: 15 },
    addCardMuscle: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    addIcon: { color: c.accent, fontSize: 24, fontWeight: '700' },
  });

import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth-helpers';
import type { Exercise, RoutineWithExercise } from '@/types/database';

export async function fetchRoutinesAndExercises(dayOfWeek: number): Promise<{
  routines: RoutineWithExercise[];
  exercises: Exercise[];
  error: string | null;
}> {
  const [routinesRes, exercisesRes] = await Promise.all([
    supabase
      .from('routines')
      .select('*, exercises(*)')
      .eq('day_of_week', dayOfWeek)
      .order('sort_order'),
    supabase.from('exercises').select('*').order('name'),
  ]);

  if (routinesRes.error) {
    return { routines: [], exercises: [], error: routinesRes.error.message };
  }
  if (exercisesRes.error) {
    return { routines: [], exercises: [], error: exercisesRes.error.message };
  }

  return {
    routines: (routinesRes.data as RoutineWithExercise[]) || [],
    exercises: exercisesRes.data || [],
    error: null,
  };
}

export async function createExercise(
  name: string,
  muscleGroup: string
): Promise<{ success: boolean; error: string | null }> {
  const userId = await getUserId();

  const { error } = await supabase
    .from('exercises')
    .insert({ user_id: userId, name: name.trim(), muscle_group: muscleGroup.trim() || 'General' });

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function addExerciseToRoutine(params: {
  dayOfWeek: number;
  exerciseId: string;
  currentCount: number;
}): Promise<{ success: boolean; error: string | null }> {
  const userId = await getUserId();

  const { error } = await supabase.from('routines').insert({
    user_id: userId,
    day_of_week: params.dayOfWeek,
    exercise_id: params.exerciseId,
    sets: 3,
    sort_order: params.currentCount,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function updateRoutineSets(
  routineId: string,
  sets: number
): Promise<{ success: boolean; error: string | null }> {
  if (sets < 1 || sets > 10) return { success: false, error: 'Sets fuera de rango' };

  const { error } = await supabase
    .from('routines')
    .update({ sets })
    .eq('id', routineId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function deleteRoutineEntry(
  routineId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routineId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function swapRoutineOrder(
  routineId1: string,
  sortOrder1: number,
  routineId2: string,
  sortOrder2: number
): Promise<{ success: boolean; error: string | null }> {
  const [res1, res2] = await Promise.all([
    supabase.from('routines').update({ sort_order: sortOrder2 }).eq('id', routineId1),
    supabase.from('routines').update({ sort_order: sortOrder1 }).eq('id', routineId2),
  ]);

  if (res1.error) return { success: false, error: res1.error.message };
  if (res2.error) return { success: false, error: res2.error.message };
  return { success: true, error: null };
}

export async function fetchDaysWithRoutines(): Promise<{
  days: number[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('routines')
    .select('day_of_week')
    .order('day_of_week');

  if (error) return { days: [], error: error.message };
  const uniqueDays = [...new Set((data || []).map((r) => r.day_of_week))];
  return { days: uniqueDays, error: null };
}

export async function copyRoutineFromDay(
  sourceDayOfWeek: number,
  targetDayOfWeek: number
): Promise<{ copiedCount: number; error: string | null }> {
  const userId = await getUserId();

  const { data: sourceRoutines, error: srcError } = await supabase
    .from('routines')
    .select('exercise_id, sets')
    .eq('day_of_week', sourceDayOfWeek)
    .eq('user_id', userId)
    .order('sort_order');

  if (srcError) return { copiedCount: 0, error: srcError.message };
  if (!sourceRoutines || sourceRoutines.length === 0) {
    return { copiedCount: 0, error: 'El día origen no tiene ejercicios' };
  }

  const { data: targetRoutines, error: tgtError } = await supabase
    .from('routines')
    .select('exercise_id')
    .eq('day_of_week', targetDayOfWeek)
    .eq('user_id', userId);

  if (tgtError) return { copiedCount: 0, error: tgtError.message };

  const existingIds = new Set((targetRoutines || []).map((r) => r.exercise_id));
  const targetCurrentCount = (targetRoutines || []).length;

  const toCopy = sourceRoutines.filter((r) => !existingIds.has(r.exercise_id));
  if (toCopy.length === 0) {
    return { copiedCount: 0, error: 'Todos los ejercicios ya están en este día' };
  }

  const inserts = toCopy.map((r, i) => ({
    user_id: userId,
    day_of_week: targetDayOfWeek,
    exercise_id: r.exercise_id,
    sets: r.sets,
    sort_order: targetCurrentCount + i,
  }));

  const { error: insertError } = await supabase.from('routines').insert(inserts);
  if (insertError) return { copiedCount: 0, error: insertError.message };
  return { copiedCount: toCopy.length, error: null };
}

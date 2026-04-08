import { supabase } from '@/lib/supabase';
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
  const { error } = await supabase
    .from('exercises')
    .insert({ name: name.trim(), muscle_group: muscleGroup.trim() || 'General' });

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function addExerciseToRoutine(params: {
  dayOfWeek: number;
  exerciseId: string;
  currentCount: number;
}): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('routines').insert({
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

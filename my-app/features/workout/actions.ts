import { supabase } from '@/lib/supabase';
import type { RoutineWithExercise } from '@/types/database';
import type { ExerciseWithSets, SetLog } from './types';

export async function fetchTodayWorkout(
  dayOfWeek: number,
  dateStr: string
): Promise<{ data: ExerciseWithSets[]; error: string | null }> {
  const { data: routines, error: routinesError } = await supabase
    .from('routines')
    .select('*, exercises(*)')
    .eq('day_of_week', dayOfWeek)
    .order('sort_order');

  if (routinesError) return { data: [], error: routinesError.message };
  if (!routines || routines.length === 0) return { data: [], error: null };

  const { data: logs, error: logsError } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('workout_date', dateStr);

  if (logsError) return { data: [], error: logsError.message };

  const exercisesWithSets = (routines as RoutineWithExercise[]).map((r) => {
    const existingLogs = (logs || []).filter(
      (l) => l.exercise_id === r.exercise_id
    );
    const sets_data: SetLog[] = [];
    for (let i = 1; i <= r.sets; i++) {
      const existing = existingLogs.find((l) => l.set_number === i);
      sets_data.push({
        set_number: i,
        reps: existing ? String(existing.reps) : '',
        weight: existing ? String(existing.weight) : '',
        saved: !!existing,
      });
    }
    return { ...r, sets_data };
  });

  return { data: exercisesWithSets, error: null };
}

export async function saveWorkoutSet(params: {
  exerciseId: string;
  dateStr: string;
  setNumber: number;
  reps: string;
  weight: string;
}): Promise<{ success: boolean; error: string | null }> {
  const { exerciseId, dateStr, setNumber, reps, weight } = params;

  if (!reps || !weight) return { success: false, error: 'Faltan datos' };

  const { error } = await supabase.from('workout_logs').upsert(
    {
      exercise_id: exerciseId,
      workout_date: dateStr,
      set_number: setNumber,
      reps: parseInt(reps, 10),
      weight: parseFloat(weight),
    },
    { onConflict: 'exercise_id,workout_date,set_number', ignoreDuplicates: false }
  );

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

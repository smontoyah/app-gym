import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth-helpers';
import type { RoutineWithExercise } from '@/types/database';
import type { ExerciseWithSets, SetLog } from './types';

export async function fetchTodayWorkout(
  dayOfWeek: number,
  dateStr: string
): Promise<{ data: ExerciseWithSets[]; error: string | null }> {
  const userId = await getUserId();

  const { data: routines, error: routinesError } = await supabase
    .from('routines')
    .select('*, exercises(*)')
    .eq('day_of_week', dayOfWeek)
    .order('sort_order');

  if (routinesError) return { data: [], error: routinesError.message };
  if (!routines || routines.length === 0) return { data: [], error: null };

  const exerciseIds = (routines as RoutineWithExercise[]).map((r) => r.exercise_id);

  const [logsRes, prevRes] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('workout_date', dateStr),
    supabase
      .from('workout_logs')
      .select('exercise_id, workout_date, set_number, reps, weight')
      .eq('user_id', userId)
      .in('exercise_id', exerciseIds)
      .lt('workout_date', dateStr)
      .order('workout_date', { ascending: false })
      .order('set_number', { ascending: true })
      .limit(50),
  ]);

  if (logsRes.error) return { data: [], error: logsRes.error.message };

  // Build lookup: exercise_id -> most recent date's logs (single pass, O(n))
  const prevByExercise: Record<string, { set_number: number; reps: number; weight: number }[]> = {};
  const firstDateByExercise: Record<string, string> = {};
  if (prevRes.data) {
    for (const log of prevRes.data) {
      if (!firstDateByExercise[log.exercise_id]) {
        firstDateByExercise[log.exercise_id] = log.workout_date;
        prevByExercise[log.exercise_id] = [{ set_number: log.set_number, reps: log.reps, weight: log.weight }];
      } else if (firstDateByExercise[log.exercise_id] === log.workout_date) {
        prevByExercise[log.exercise_id].push({ set_number: log.set_number, reps: log.reps, weight: log.weight });
      }
    }
  }

  const exercisesWithSets = (routines as RoutineWithExercise[]).map((r) => {
    const existingLogs = (logsRes.data || []).filter(
      (l) => l.exercise_id === r.exercise_id
    );
    const prevLogs = prevByExercise[r.exercise_id] || [];
    const sets_data: SetLog[] = [];
    for (let i = 1; i <= r.sets; i++) {
      const existing = existingLogs.find((l) => l.set_number === i);
      const prevSet = prevLogs.find((p) => p.set_number === i);
      sets_data.push({
        set_number: i,
        reps: existing ? String(existing.reps) : (prevSet ? String(prevSet.reps) : ''),
        weight: existing ? String(existing.weight) : (prevSet ? String(prevSet.weight) : ''),
        saved: !!existing,
        previousReps: prevSet ? String(prevSet.reps) : undefined,
        previousWeight: prevSet ? String(prevSet.weight) : undefined,
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

  const userId = await getUserId();

  const { error } = await supabase.from('workout_logs').upsert(
    {
      user_id: userId,
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

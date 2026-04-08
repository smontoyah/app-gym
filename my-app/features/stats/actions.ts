import { supabase } from '@/lib/supabase';
import type { ExerciseStat } from './types';

export async function fetchExerciseStats(): Promise<{
  data: ExerciseStat[];
  error: string | null;
}> {
  const { data: exercises, error: exError } = await supabase
    .from('exercises')
    .select('*')
    .order('name');

  if (exError) return { data: [], error: exError.message };
  if (!exercises || exercises.length === 0) return { data: [], error: null };

  const { data: logs, error: logsError } = await supabase
    .from('workout_logs')
    .select('*')
    .order('workout_date', { ascending: false });

  if (logsError) return { data: [], error: logsError.message };

  const stats: ExerciseStat[] = exercises
    .map((exercise) => {
      const exerciseLogs = (logs || []).filter(
        (l) => l.exercise_id === exercise.id
      );

      if (exerciseLogs.length === 0) return null;

      const dates = [...new Set(exerciseLogs.map((l) => l.workout_date))];
      const maxWeight = Math.max(...exerciseLogs.map((l) => Number(l.weight)));
      const lastDate = dates[0];
      const lastLogs = exerciseLogs.filter((l) => l.workout_date === lastDate);
      const lastWeight = Math.max(...lastLogs.map((l) => Number(l.weight)));

      const recentLogs = dates.slice(0, 10).map((date) => {
        const dayLogs = exerciseLogs.filter((l) => l.workout_date === date);
        const bestSet = dayLogs.reduce((best, l) =>
          Number(l.weight) > Number(best.weight) ? l : best
        );
        return {
          date,
          weight: Number(bestSet.weight),
          reps: bestSet.reps,
        };
      });

      return {
        exercise,
        lastWeight,
        maxWeight,
        totalSessions: dates.length,
        recentLogs,
      };
    })
    .filter(Boolean) as ExerciseStat[];

  return { data: stats, error: null };
}

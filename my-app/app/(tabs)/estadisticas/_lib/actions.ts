import { supabase } from '@/lib/supabase';
import type { ExerciseStat } from './types';

export async function fetchExerciseStats(): Promise<{
  data: ExerciseStat[];
  error: string | null;
}> {
  // Fetch exercises and logs in parallel
  const [exRes, logsRes] = await Promise.all([
    supabase.from('exercises').select('*').order('name'),
    supabase.from('workout_logs').select('*').order('workout_date', { ascending: false }).limit(500),
  ]);

  if (exRes.error) return { data: [], error: exRes.error.message };
  if (!exRes.data || exRes.data.length === 0) return { data: [], error: null };
  if (logsRes.error) return { data: [], error: logsRes.error.message };

  // Index logs by exercise_id in a single pass (O(n))
  const logsByExercise = new Map<string, typeof logsRes.data>();
  for (const log of logsRes.data || []) {
    const existing = logsByExercise.get(log.exercise_id);
    if (existing) {
      existing.push(log);
    } else {
      logsByExercise.set(log.exercise_id, [log]);
    }
  }

  const stats: ExerciseStat[] = [];

  for (const exercise of exRes.data) {
    const exerciseLogs = logsByExercise.get(exercise.id);
    if (!exerciseLogs || exerciseLogs.length === 0) continue;

    let maxWeight = 0;
    const dateSet = new Set<string>();

    for (const l of exerciseLogs) {
      const w = Number(l.weight);
      if (w > maxWeight) maxWeight = w;
      dateSet.add(l.workout_date);
    }

    // Dates are already sorted desc from the query
    const dates = [...dateSet];
    const lastDate = dates[0];
    let lastWeight = 0;
    for (const l of exerciseLogs) {
      if (l.workout_date !== lastDate) break;
      const w = Number(l.weight);
      if (w > lastWeight) lastWeight = w;
    }

    // Build recent logs — best set per date for last 10 sessions
    const recentLogs = dates.slice(0, 10).map((date) => {
      let bestWeight = 0;
      let bestReps = 0;
      for (const l of exerciseLogs) {
        if (l.workout_date !== date) continue;
        const w = Number(l.weight);
        if (w > bestWeight) {
          bestWeight = w;
          bestReps = l.reps;
        }
      }
      return { date, weight: bestWeight, reps: bestReps };
    });

    stats.push({
      exercise,
      lastWeight,
      maxWeight,
      totalSessions: dates.length,
      recentLogs,
    });
  }

  return { data: stats, error: null };
}

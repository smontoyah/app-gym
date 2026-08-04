import { supabase } from '@/lib/supabase';
import type { ExerciseStatsRow } from '@/types/database';
import type { ExerciseStat } from './types';

/**
 * Las estadísticas se agregan en Postgres, no en el cliente.
 *
 * Antes se traían los últimos 500 logs y se agrupaban acá: con este plan
 * (80 series por semana) el tope se alcanzaba a las ~6 semanas y la historia
 * quedaba truncada sin avisar.
 */
export async function fetchExerciseStats(sessions = 10): Promise<{
  data: ExerciseStat[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('exercise_stats', { p_sessions: sessions });

  if (error) return { data: [], error: error.message };

  const stats = ((data ?? []) as ExerciseStatsRow[]).map((row) => ({
    exerciseId: row.exercise_id,
    name: row.name,
    muscleGroup: row.muscle_group,
    totalSessions: Number(row.total_sessions),
    lastDate: row.last_date,
    lastWeight: Number(row.last_weight),
    maxWeight: Number(row.max_weight),
    lastE1rm: Number(row.last_e1rm),
    bestE1rm: Number(row.best_e1rm),
    recent: (row.recent ?? []).map((r) => ({
      date: r.date,
      weight: Number(r.weight),
      reps: Number(r.reps),
      e1rm: Number(r.e1rm),
      volume: Number(r.volume),
      rpe: r.rpe === null ? null : Number(r.rpe),
      sets: Number(r.sets),
    })),
  }));

  return { data: stats, error: null };
}

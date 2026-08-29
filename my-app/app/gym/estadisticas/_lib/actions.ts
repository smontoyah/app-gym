import { supabase } from '@/lib/supabase';
import type { ExerciseStatsRow, TrainingSummaryRow } from '@/types/database';
import type { DateRange } from '@/lib/date-ranges';
import { EMPTY_SUMMARY, type ExerciseStat, type TrainingSummary } from './types';

/**
 * Las estadísticas se agregan en Postgres, no en el cliente.
 *
 * Antes se traían los últimos 500 logs y se agrupaban acá: con este plan
 * (80 series por semana) el tope se alcanzaba a las ~6 semanas y la historia
 * quedaba truncada sin avisar. Por la misma razón el rango de fechas viaja
 * como parámetro en vez de filtrarse después de bajarlo todo.
 */

/** Sesiones por ejercicio que se traen para la mini-gráfica de la tarjeta. */
const RECENT_SESSIONS = 12;

/** `numeric` de Postgres llega como texto por PostgREST; el `null` se respeta. */
function num(value: number | string | null): number {
  return value === null ? 0 : Number(value);
}

function maybeNum(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function mapExerciseStats(rows: ExerciseStatsRow[]): ExerciseStat[] {
  return rows.map((row) => ({
    exerciseId: row.exercise_id,
    name: row.name,
    muscleGroup: row.muscle_group,
    sessions: num(row.sessions),
    sets: num(row.sets),
    volume: num(row.volume),
    avgRpe: maybeNum(row.avg_rpe),
    lastDate: row.last_date,
    lastWeight: num(row.last_weight),
    lastReps: num(row.last_reps),
    lastE1rm: num(row.last_e1rm),
    maxWeight: num(row.max_weight),
    bestE1rm: num(row.best_e1rm),
    prDate: row.pr_date,
    recent: (row.recent ?? []).map((point) => ({
      date: point.date,
      weight: num(point.weight),
      reps: num(point.reps),
      e1rm: num(point.e1rm),
      volume: num(point.volume),
      rpe: maybeNum(point.rpe),
      sets: num(point.sets),
    })),
  }));
}

function mapSummary(row: TrainingSummaryRow): TrainingSummary {
  return {
    sessions: num(row.sessions),
    sets: num(row.sets),
    volume: num(row.volume),
    avgRpe: maybeNum(row.avg_rpe),
    exercises: num(row.exercises),
    avgDurationMin: maybeNum(row.avg_duration_min),
    cardioSessions: num(row.cardio_sessions),
    cardioMinutes: num(row.cardio_minutes),
    prev: {
      sessions: num(row.prev_sessions),
      sets: num(row.prev_sets),
      volume: num(row.prev_volume),
      avgRpe: maybeNum(row.prev_avg_rpe),
    },
    byDay: (row.by_day ?? []).map((day) => ({
      date: day.date,
      sets: num(day.sets),
      volume: num(day.volume),
      rpe: maybeNum(day.rpe),
      exercises: num(day.exercises),
      cardioMinutes: num(day.minutes),
      durationMin: maybeNum(day.duration),
    })),
    byMuscle: (row.by_muscle ?? []).map((muscle) => ({
      group: muscle.group,
      sets: num(muscle.sets),
      volume: num(muscle.volume),
      sessions: num(muscle.sessions),
    })),
    records: (row.records ?? []).map((record) => ({
      exerciseId: record.exerciseId,
      name: record.name,
      muscleGroup: record.muscleGroup,
      date: record.date,
      e1rm: num(record.e1rm),
      prevBest: num(record.prevBest),
    })),
    stale: (row.stale ?? []).map((entry) => ({
      exerciseId: entry.exerciseId,
      name: entry.name,
      muscleGroup: entry.muscleGroup,
      lastDate: entry.lastDate,
    })),
  };
}

export type StatsPayload = {
  summary: TrainingSummary;
  stats: ExerciseStat[];
  error: string | null;
};

/**
 * Las dos consultas van en paralelo y comparten el mismo rango: son la misma
 * pantalla, y verlas llegar por separado se leería como dos recargas.
 */
export async function fetchStats(range: DateRange): Promise<StatsPayload> {
  const [summaryRes, statsRes] = await Promise.all([
    supabase.rpc('training_summary', { p_from: range.from, p_to: range.to }),
    supabase.rpc('exercise_stats', {
      p_from: range.from,
      p_to: range.to,
      p_sessions: RECENT_SESSIONS,
    }),
  ]);

  const error = summaryRes.error?.message ?? statsRes.error?.message ?? null;
  if (error) return { summary: EMPTY_SUMMARY, stats: [], error };

  const summaryRow = ((summaryRes.data ?? []) as TrainingSummaryRow[])[0];

  return {
    summary: summaryRow ? mapSummary(summaryRow) : EMPTY_SUMMARY,
    stats: mapExerciseStats((statsRes.data ?? []) as ExerciseStatsRow[]),
    error: null,
  };
}

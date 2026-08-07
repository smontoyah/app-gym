import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth-helpers';
import { dayOfWeek } from '@/lib/date';
import type { PreviousSetRow, RoutineWithExercise } from '@/types/database';
import type {
  CardioEntry,
  DayWorkout,
  ExerciseWithSets,
  SessionWindow,
  SetLog,
  WorkoutBlock,
} from './types';

/** Incremento mínimo razonable en gimnasio (mancuernas / stack de máquina). */
const LOAD_STEP_KG = 2.5;

/** '13' → 13 · '13 c/u' → 13 · '18' → 18 · null → null */
function parseTargetReps(target: string | null): number | null {
  if (!target) return null;
  const match = target.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Sugerencia de carga para hoy a partir de la sesión previa.
 * El plan es a repeticiones y RIR fijos, así que la progresión es por carga:
 * si la última vez completaste el objetivo en todas las series, toca subir.
 */
function buildSuggestion(
  previous: PreviousSetRow[],
  targetReps: number | null,
  rpeTarget: number | null
): string | undefined {
  if (previous.length === 0 || targetReps === null) return undefined;

  const topWeight = Math.max(...previous.map((p) => Number(p.weight)));
  if (!Number.isFinite(topWeight) || topWeight <= 0) return undefined;

  const hitAllReps = previous.every((p) => p.reps >= targetReps);
  const rpes = previous.map((p) => p.rpe).filter((r): r is number => r !== null);
  const avgRpe = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const rpeUnderTarget = rpeTarget === null || avgRpe === null || avgRpe <= rpeTarget;

  if (hitAllReps && rpeUnderTarget) {
    const next = Math.round((topWeight + LOAD_STEP_KG) * 10) / 10;
    return `Sugerido: subí a ${next} kg`;
  }
  if (hitAllReps) {
    return `Sugerido: mantené ${topWeight} kg (RPE por encima del objetivo)`;
  }
  return `Sugerido: mantené ${topWeight} kg hasta completar ${targetReps} reps`;
}

/** Agrupa ejercicios consecutivos que comparten super serie en un solo bloque. */
function groupIntoBlocks(exercises: ExerciseWithSets[]): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];

  for (const exercise of exercises) {
    const group = exercise.superset_group;
    const last = blocks[blocks.length - 1];

    if (group && last && last.supersetGroup === group) {
      last.exercises.push(exercise);
    } else {
      blocks.push({
        key: group ? `ss-${group}-${exercise.id}` : exercise.id,
        supersetGroup: group,
        exercises: [exercise],
      });
    }
  }

  return blocks;
}

/**
 * Del primer input al último. Se mira `created_at` y no `updated_at`: corregir
 * una serie días después no debería estirar la duración de aquella sesión.
 * Misma regla que aplica `export_training_data`, para que app y CSV coincidan.
 */
function sessionWindow(timestamps: (string | null | undefined)[]): SessionWindow | null {
  const stamps = timestamps
    .filter((t): t is string => !!t)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  if (stamps.length === 0) return null;
  return { start: stamps[0], end: stamps[stamps.length - 1] };
}

export async function fetchDayWorkout(
  dateStr: string
): Promise<{ data: DayWorkout; error: string | null }> {
  const userId = await getUserId();
  const dow = dayOfWeek(dateStr);
  const empty: DayWorkout = {
    blocks: [],
    cardio: { plan: null, log: null },
    phase: null,
    session: null,
  };

  const [routinesRes, cardioPlanRes, cardioLogRes, phaseRes] = await Promise.all([
    supabase
      .from('routines')
      .select('*, exercises(*)')
      .eq('user_id', userId)
      .eq('day_of_week', dow)
      .order('sort_order'),
    supabase
      .from('cardio_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('day_of_week', dow)
      .maybeSingle(),
    supabase
      .from('cardio_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('workout_date', dateStr)
      .maybeSingle(),
    supabase
      .from('training_phases')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (routinesRes.error) return { data: empty, error: routinesRes.error.message };

  const cardio: CardioEntry = {
    plan: cardioPlanRes.data ?? null,
    log: cardioLogRes.data ?? null,
  };
  const phase = phaseRes.data ?? null;
  const rpeTarget = phase?.rpe_target ? parseTargetReps(phase.rpe_target) : null;

  const routines = (routinesRes.data ?? []) as RoutineWithExercise[];
  if (routines.length === 0) {
    const session = sessionWindow([cardio.log?.created_at]);
    return { data: { blocks: [], cardio, phase, session }, error: null };
  }

  const exerciseIds = routines.map((r) => r.exercise_id);

  const [logsRes, previousRes] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('workout_date', dateStr),
    supabase.rpc('previous_sets', { p_before: dateStr, p_exercise_ids: exerciseIds }),
  ]);

  if (logsRes.error) {
    return { data: { blocks: [], cardio, phase, session: null }, error: logsRes.error.message };
  }

  const previousByExercise = new Map<string, PreviousSetRow[]>();
  for (const row of (previousRes.data ?? []) as PreviousSetRow[]) {
    const bucket = previousByExercise.get(row.exercise_id);
    if (bucket) bucket.push(row);
    else previousByExercise.set(row.exercise_id, [row]);
  }

  const exercises: ExerciseWithSets[] = routines.map((routine) => {
    const savedLogs = (logsRes.data ?? []).filter((l) => l.exercise_id === routine.exercise_id);
    const previous = previousByExercise.get(routine.exercise_id) ?? [];
    const targetReps = parseTargetReps(routine.target_reps);

    const sets_data: SetLog[] = [];
    for (let n = 1; n <= routine.sets; n++) {
      const saved = savedLogs.find((l) => l.set_number === n);
      const prev = previous.find((p) => p.set_number === n);
      sets_data.push({
        set_number: n,
        reps: saved ? String(saved.reps) : prev ? String(prev.reps) : '',
        weight: saved ? String(saved.weight) : prev ? String(prev.weight) : '',
        rpe: saved?.rpe != null ? String(saved.rpe) : '',
        saved: !!saved,
        previousReps: prev ? String(prev.reps) : undefined,
        previousWeight: prev ? String(prev.weight) : undefined,
        previousRpe: prev?.rpe != null ? String(prev.rpe) : undefined,
      });
    }

    return {
      ...routine,
      sets_data,
      previousDate: previous[0]?.workout_date,
      suggestion: buildSuggestion(previous, targetReps, rpeTarget),
    };
  });

  const session = sessionWindow([
    ...(logsRes.data ?? []).map((l) => l.created_at),
    cardio.log?.created_at,
  ]);

  return { data: { blocks: groupIntoBlocks(exercises), cardio, phase, session }, error: null };
}

/** `loggedAt` es la hora del servidor: con ella se mueve el fin de la jornada. */
export type SaveSetResult = {
  success: boolean;
  error: string | null;
  loggedAt: string | null;
};

export async function saveWorkoutSet(params: {
  exerciseId: string;
  dateStr: string;
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
}): Promise<SaveSetResult> {
  const { exerciseId, dateStr, setNumber, reps, weight, rpe } = params;

  if (!reps || !weight) return { success: false, error: 'Faltan datos', loggedAt: null };

  const parsedReps = parseInt(reps, 10);
  const parsedWeight = parseFloat(weight);
  if (!Number.isFinite(parsedReps) || !Number.isFinite(parsedWeight)) {
    return { success: false, error: 'Valores inválidos', loggedAt: null };
  }

  const parsedRpe = rpe ? parseFloat(rpe) : NaN;
  if (rpe && (!Number.isFinite(parsedRpe) || parsedRpe < 1 || parsedRpe > 10)) {
    return { success: false, error: 'El RPE debe estar entre 1 y 10', loggedAt: null };
  }

  const userId = await getUserId();

  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        workout_date: dateStr,
        set_number: setNumber,
        reps: parsedReps,
        weight: parsedWeight,
        rpe: rpe ? parsedRpe : null,
      },
      { onConflict: 'exercise_id,workout_date,set_number', ignoreDuplicates: false }
    )
    .select('created_at')
    .single();

  if (error) return { success: false, error: error.message, loggedAt: null };
  return { success: true, error: null, loggedAt: data?.created_at ?? null };
}

export async function saveCardioSession(params: {
  dateStr: string;
  minutes: string;
  modality: string | null;
}): Promise<{ success: boolean; error: string | null }> {
  const parsed = parseInt(params.minutes, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { success: false, error: 'Minutos inválidos' };
  }

  const userId = await getUserId();

  const { error } = await supabase.from('cardio_logs').upsert(
    {
      user_id: userId,
      workout_date: params.dateStr,
      minutes: parsed,
      modality: params.modality,
    },
    { onConflict: 'user_id,workout_date', ignoreDuplicates: false }
  );

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

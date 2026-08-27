import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth-helpers';
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

/**
 * Crea un ejercicio en el catálogo. No existe la operación inversa a propósito:
 * el catálogo es acumulativo y un ejercicio no se borra nunca, porque de él
 * cuelga todo el historial de series. Quitar un ejercicio de un día se hace con
 * `deleteRoutineEntry`, que toca la rutina y deja el historial en paz.
 */
export async function createExercise(
  name: string,
  muscleGroup: string
): Promise<{ success: boolean; error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { success: false, error: auth.error };

  const { error } = await supabase
    .from('exercises')
    .insert({ user_id: auth.userId, name: name.trim(), muscle_group: muscleGroup.trim() || 'General' });

  if (error) {
    // Como nada se borra, un duplicado por tipeo queda para siempre y parte el
    // historial en dos. La base lo rechaza (unique por user_id + nombre en
    // minúsculas); acá se traduce, porque «duplicate key value violates unique
    // constraint "exercises_user_name_unique"» no le dice nada a nadie.
    if (error.code === '23505') {
      return { success: false, error: `Ya tenés un ejercicio llamado «${name.trim()}»` };
    }
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

export async function addExerciseToRoutine(params: {
  dayOfWeek: number;
  exerciseId: string;
  currentCount: number;
}): Promise<{ success: boolean; error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { success: false, error: auth.error };

  const { error } = await supabase.from('routines').insert({
    user_id: auth.userId,
    day_of_week: params.dayOfWeek,
    exercise_id: params.exerciseId,
    sets: 3,
    sort_order: params.currentCount,
  });

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

/**
 * Series por ejercicio que acepta la prescripción. Se exporta para que los
 * botones ± se deshabiliten en los extremos: antes mandaban el valor fuera de
 * rango y el usuario recibía un «Sets fuera de rango» por tocar «−» en 1.
 */
export const SETS_RANGE = { min: 1, max: 10 } as const;

/** Actualiza la prescripción del entrenador para una fila de la rutina. */
export async function updateRoutinePrescription(
  routineId: string,
  values: {
    sets?: number;
    target_reps?: string | null;
    rest_seconds?: number | null;
    cadence?: string | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  if (
    values.sets !== undefined &&
    (values.sets < SETS_RANGE.min || values.sets > SETS_RANGE.max)
  ) {
    return {
      success: false,
      error: `Las series tienen que estar entre ${SETS_RANGE.min} y ${SETS_RANGE.max}`,
    };
  }
  if (values.rest_seconds != null && (values.rest_seconds < 0 || values.rest_seconds > 600)) {
    return { success: false, error: 'El descanso debe estar entre 0 y 600 s' };
  }

  const { error } = await supabase.from('routines').update(values).eq('id', routineId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

// Las tres operaciones de abajo se hacían con varios UPDATE independientes:
// si el segundo fallaba, el orden o el día quedaban a medias. Ahora son RPCs
// transaccionales (`security invoker`, así que la RLS sigue aplicando).

export async function swapRoutineOrder(
  routineId1: string,
  routineId2: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('swap_routine_order', {
    p_a: routineId1,
    p_b: routineId2,
  });

  if (error) return { success: false, error: error.message };
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
  const auth = await currentUserId();
  if (!auth.userId) return { copiedCount: 0, error: auth.error };
  const userId = auth.userId;

  const { data: sourceRoutines, error: srcError } = await supabase
    .from('routines')
    .select('exercise_id, sets, target_reps, rest_seconds, cadence, superset_group, notes')
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

  // Copia también la prescripción del entrenador, no solo el ejercicio y las series.
  const inserts = toCopy.map((r, i) => ({
    user_id: userId,
    day_of_week: targetDayOfWeek,
    exercise_id: r.exercise_id,
    sets: r.sets,
    sort_order: targetCurrentCount + i,
    target_reps: r.target_reps,
    rest_seconds: r.rest_seconds,
    cadence: r.cadence,
    superset_group: r.superset_group,
    notes: r.notes,
  }));

  const { error: insertError } = await supabase.from('routines').insert(inserts);
  if (insertError) return { copiedCount: 0, error: insertError.message };
  return { copiedCount: toCopy.length, error: null };
}

export async function moveRoutineToDay(
  sourceDayOfWeek: number,
  targetDayOfWeek: number
): Promise<{ movedCount: number; error: string | null }> {
  const { data, error } = await supabase.rpc('move_routine_to_day', {
    p_source: sourceDayOfWeek,
    p_target: targetDayOfWeek,
  });

  if (error) return { movedCount: 0, error: error.message };
  // `0` es un resultado válido, no un error: pasa cuando todos los ejercicios
  // del origen ya estaban en el destino y el RPC los descartó del origen (que
  // igual queda libre, como promete el diálogo). Tratarlo como error dejaba la
  // pantalla mostrando filas que la base ya había borrado.
  return { movedCount: data ?? 0, error: null };
}

export async function swapRoutineDays(
  dayA: number,
  dayB: number
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('swap_routine_days', { p_a: dayA, p_b: dayB });

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Ninguno de los dos días tiene ejercicios' };
  return { success: true, error: null };
}

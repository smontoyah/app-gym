import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth-helpers';
import {
  GOAL_FIELDS,
  resolveGoals,
  type GoalField,
  type GoalValues,
  type ResolvedGoals,
} from './objetivos';
import type {
  FoodState, GoalProfile, MealSlot, NutritionGoals, NutritionLogMacros,
} from '@/types/database';

export const MEALS: MealSlot[] = ['desayuno', 'almuerzo', 'cena', 'snack'];

export const MEAL_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snacks',
};

// Los campos de objetivo se mudaron a `objetivos.ts`, que no toca la red. Se
// re-exportan desde acá porque media app los importa por este camino.
export { GOAL_FIELDS, GOAL_LABELS, GOAL_UNITS, type GoalField } from './objetivos';

export type DayTotals = Record<GoalField, number>;

/** Un día sin nada registrado. Congelado: siempre se copia antes de acumular. */
export const ZERO_TOTALS: Readonly<DayTotals> = Object.freeze({
  energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
});

export function sumTotals(entries: NutritionLogMacros[]): DayTotals {
  return entries.reduce<DayTotals>(
    (acc, e) => {
      // `Number()` explícito: si PostgREST llegara a mandar los `numeric` como
      // texto, un `+=` los concatenaría y el total del día sería basura.
      for (const f of GOAL_FIELDS) acc[f] += Number(e[f] ?? 0);
      return acc;
    },
    { ...ZERO_TOTALS }
  );
}

/**
 * Lo que aportarían `quantityG` de algo del catálogo, sin guardar nada.
 *
 * La base va explícita porque las dos fuentes del diario no la comparten: un
 * producto guarda sus macros por 100 g y una receta las guarda para todo el
 * preparado (`total_g`). Es la misma cuenta que hace la vista
 * `nutrition_log_macros` en la base, hecha acá para poder mostrarla antes de
 * registrar el renglón.
 */
export function macrosFor(
  source: Partial<Record<GoalField, number | string | null>>,
  baseG: number | string,
  quantityG: number
): DayTotals {
  const base = Number(baseG);
  // Una receta vacía llega con total_g en 0: dividir ahí daría Infinity y la
  // simulación mostraría barras desbordadas en vez de un aporte de cero.
  if (!Number.isFinite(base) || base <= 0) return { ...ZERO_TOTALS };

  const factor = quantityG / base;
  const out = { ...ZERO_TOTALS };
  for (const f of GOAL_FIELDS) out[f] = Number(source[f] ?? 0) * factor;
  return out;
}

/**
 * Todo lo que necesita el diario de un día: lo comido, el perfil que rige y el
 * objetivo ya resuelto en gramos.
 *
 * El objetivo sale resuelto y no crudo a propósito. La pantalla no tiene por
 * qué saber que la tabla guarda g/kg, y si cada consumidor hiciera la
 * multiplicación por su cuenta terminarían discrepando por un redondeo.
 */
export async function fetchDay(dateStr: string): Promise<{
  entries: NutritionLogMacros[];
  totals: DayTotals;
  goals: ResolvedGoals;
  profile: GoalProfile;
  /** El pesaje con el que se resolvió. `null` si todavía no hay ninguno. */
  weightKg: number | null;
  error: string | null;
}> {
  const [logsRes, goalsRes, dayRes, weightRes] = await Promise.all([
    supabase
      .from('nutrition_log_macros')
      .select('*')
      .eq('logged_on', dateStr)
      .order('created_at'),
    // Sin filtro de perfil: vienen las dos filas y acá se elige la que rige.
    supabase.from('nutrition_goals').select('*'),
    // maybeSingle: lo normal es que NO haya fila — eso significa «día normal».
    supabase.from('nutrition_days').select('*').eq('logged_on', dateStr).maybeSingle(),
    supabase
      .from('body_weight_logs')
      .select('weight_kg')
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile: GoalProfile = dayRes.data?.goal_profile ?? 'normal';
  const weightKg = weightRes.data ? Number(weightRes.data.weight_kg) : null;
  const goalRow =
    ((goalsRes.data ?? []) as NutritionGoals[]).find((g) => g.profile === profile) ?? null;
  const goals = resolveGoals(goalRow, weightKg);

  if (logsRes.error) {
    return {
      entries: [],
      totals: { ...ZERO_TOTALS },
      goals,
      profile,
      weightKg,
      error: logsRes.error.message,
    };
  }

  const entries = (logsRes.data ?? []) as NutritionLogMacros[];
  return { entries, totals: sumTotals(entries), goals, profile, weightKg, error: null };
}

export async function addEntry(params: {
  productId?: string;
  recipeId?: string;
  loggedOn: string;
  meal: MealSlot;
  /** Siempre en la forma base del producto: la conversión ya se hizo. */
  quantityG: number;
  /** En qué forma se pesó. Solo para poder mostrar después lo que dijo la balanza. */
  loggedState?: FoodState | null;
  note?: string;
}): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  const { error } = await supabase.from('nutrition_logs').insert({
    user_id: auth.userId,
    product_id: params.productId ?? null,
    recipe_id: params.recipeId ?? null,
    logged_on: params.loggedOn,
    meal: params.meal,
    quantity_g: params.quantityG,
    logged_state: params.loggedState ?? null,
    note: params.note?.trim() || null,
  });
  return { error: error?.message ?? null };
}

export async function deleteEntry(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('nutrition_logs').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Los dos perfiles y el peso con el que se resuelven, para la pantalla de objetivos. */
export async function fetchGoals(): Promise<{
  byProfile: Record<GoalProfile, NutritionGoals | null>;
  weightKg: number | null;
  error: string | null;
}> {
  const [goalsRes, weightRes] = await Promise.all([
    supabase.from('nutrition_goals').select('*'),
    supabase
      .from('body_weight_logs')
      .select('weight_kg')
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const byProfile: Record<GoalProfile, NutritionGoals | null> = { normal: null, ciclado: null };
  for (const row of (goalsRes.data ?? []) as NutritionGoals[]) byProfile[row.profile] = row;

  return {
    byProfile,
    weightKg: weightRes.data ? Number(weightRes.data.weight_kg) : null,
    error: goalsRes.error?.message ?? null,
  };
}

export async function saveGoals(
  profile: GoalProfile,
  values: GoalValues
): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  // El conflicto va por (user_id, profile), que es la PK nueva. Con el
  // 'user_id' de antes, guardar el perfil de ciclado pisaría el normal.
  const { error } = await supabase
    .from('nutrition_goals')
    .upsert({ user_id: auth.userId, profile, ...values }, { onConflict: 'user_id,profile' });
  return { error: error?.message ?? null };
}

/**
 * Marca (o desmarca) un día como de ciclado.
 *
 * Volver a 'normal' BORRA la fila en vez de guardarla: la ausencia es el
 * default, y así la tabla solo contiene los días que de verdad se salieron de
 * lo habitual en lugar de una fila por cada día del año.
 */
export async function setDayProfile(
  loggedOn: string,
  profile: GoalProfile
): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  if (profile === 'normal') {
    const { error } = await supabase.from('nutrition_days').delete().eq('logged_on', loggedOn);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from('nutrition_days')
    .upsert(
      { user_id: auth.userId, logged_on: loggedOn, goal_profile: profile },
      { onConflict: 'user_id,logged_on' }
    );
  return { error: error?.message ?? null };
}

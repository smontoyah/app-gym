import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth-helpers';
import type {
  FoodState, MealSlot, NutritionGoals, NutritionLogMacros,
} from '@/types/database';

export const MEALS: MealSlot[] = ['desayuno', 'almuerzo', 'cena', 'snack'];

export const MEAL_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snacks',
};

/** Las cuatro que se muestran contra el objetivo. */
export const GOAL_FIELDS = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;
export type GoalField = (typeof GOAL_FIELDS)[number];

export const GOAL_LABELS: Record<GoalField, string> = {
  energy_kcal: 'Calorías',
  protein_g: 'Proteína',
  carbs_g: 'Carbos',
  fat_g: 'Grasa',
  fiber_g: 'Fibra',
};

export const GOAL_UNITS: Record<GoalField, string> = {
  energy_kcal: 'kcal',
  protein_g: 'g',
  carbs_g: 'g',
  fat_g: 'g',
  fiber_g: 'g',
};

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

export async function fetchDay(dateStr: string): Promise<{
  entries: NutritionLogMacros[];
  totals: DayTotals;
  goals: NutritionGoals | null;
  error: string | null;
}> {
  const [logsRes, goalsRes] = await Promise.all([
    supabase
      .from('nutrition_log_macros')
      .select('*')
      .eq('logged_on', dateStr)
      .order('created_at'),
    // maybeSingle: es normal que todavía no haya objetivo configurado, y con
    // single() esa ausencia llegaría como error en vez de como null.
    supabase.from('nutrition_goals').select('*').maybeSingle(),
  ]);

  if (logsRes.error) {
    return { entries: [], totals: { ...ZERO_TOTALS }, goals: null, error: logsRes.error.message };
  }

  const entries = (logsRes.data ?? []) as NutritionLogMacros[];
  return {
    entries,
    totals: sumTotals(entries),
    goals: goalsRes.data ?? null,
    error: null,
  };
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

export async function fetchGoals(): Promise<{ goals: NutritionGoals | null; error: string | null }> {
  const { data, error } = await supabase.from('nutrition_goals').select('*').maybeSingle();
  return { goals: data ?? null, error: error?.message ?? null };
}

export async function saveGoals(
  values: Record<GoalField, number | null>
): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  // upsert sobre la PK (user_id): hay una sola fila de objetivo por usuario.
  const { error } = await supabase
    .from('nutrition_goals')
    .upsert({ user_id: auth.userId, ...values }, { onConflict: 'user_id' });
  return { error: error?.message ?? null };
}

import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth-helpers';
import type {
  MealSlot, NutritionGoals, NutritionLogMacros,
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

const ZERO: DayTotals = { energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

export function sumTotals(entries: NutritionLogMacros[]): DayTotals {
  return entries.reduce<DayTotals>(
    (acc, e) => {
      for (const f of GOAL_FIELDS) acc[f] += e[f] ?? 0;
      return acc;
    },
    { ...ZERO }
  );
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
    return { entries: [], totals: { ...ZERO }, goals: null, error: logsRes.error.message };
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
  quantityG: number;
  note?: string;
}): Promise<{ error: string | null }> {
  const userId = await getUserId();
  const { error } = await supabase.from('nutrition_logs').insert({
    user_id: userId,
    product_id: params.productId ?? null,
    recipe_id: params.recipeId ?? null,
    logged_on: params.loggedOn,
    meal: params.meal,
    quantity_g: params.quantityG,
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
  const userId = await getUserId();
  // upsert sobre la PK (user_id): hay una sola fila de objetivo por usuario.
  const { error } = await supabase
    .from('nutrition_goals')
    .upsert({ user_id: userId, ...values }, { onConflict: 'user_id' });
  return { error: error?.message ?? null };
}

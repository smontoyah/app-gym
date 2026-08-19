import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth-helpers';
import type { Recipe, RecipeItemWithProduct, RecipeNutrition } from '@/types/database';

export async function fetchRecipes(): Promise<{
  recipes: RecipeNutrition[];
  empty: Recipe[];
  error: string | null;
}> {
  // La vista hace JOIN con los ingredientes, así que una receta recién creada
  // y todavía vacía no aparece ahí. Se traen aparte para no perderlas de vista.
  const [withItems, all] = await Promise.all([
    supabase.from('recipe_nutrition').select('*').order('name'),
    supabase.from('recipes').select('*').order('name'),
  ]);

  if (withItems.error) return { recipes: [], empty: [], error: withItems.error.message };

  const conIngredientes = new Set((withItems.data ?? []).map((r) => r.recipe_id));
  return {
    recipes: (withItems.data ?? []) as RecipeNutrition[],
    empty: (all.data ?? []).filter((r) => !conIngredientes.has(r.id)),
    error: null,
  };
}

export async function fetchRecipe(id: string): Promise<{
  recipe: Recipe | null;
  items: RecipeItemWithProduct[];
  nutrition: RecipeNutrition | null;
  error: string | null;
}> {
  const [recipeRes, itemsRes, nutRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', id).single(),
    supabase
      .from('recipe_items')
      .select('*, food_products(*)')
      .eq('recipe_id', id)
      .order('sort_order'),
    supabase.from('recipe_nutrition').select('*').eq('recipe_id', id).maybeSingle(),
  ]);

  if (recipeRes.error) return { recipe: null, items: [], nutrition: null, error: recipeRes.error.message };

  return {
    recipe: recipeRes.data,
    items: (itemsRes.data ?? []) as RecipeItemWithProduct[],
    nutrition: nutRes.data ?? null,
    error: null,
  };
}

export async function createRecipe(name: string): Promise<{ id: string | null; error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { id: null, error: auth.error };

  const { data, error } = await supabase
    .from('recipes')
    .insert({ user_id: auth.userId, name: name.trim() })
    .select('id')
    .single();
  return { id: data?.id ?? null, error: error?.message ?? null };
}

export async function updateRecipe(
  id: string,
  values: { name?: string; yield_g?: number | null; notes?: string | null }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('recipes').update(values).eq('id', id);
  return { error: error?.message ?? null };
}

export async function addItem(
  recipeId: string,
  productId: string,
  quantityG: number,
  sortOrder: number
): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  const { error } = await supabase.from('recipe_items').insert({
    user_id: auth.userId,
    recipe_id: recipeId,
    product_id: productId,
    quantity_g: quantityG,
    sort_order: sortOrder,
  });
  // 23505 = unique_violation sobre (recipe_id, product_id)
  if (error?.code === '23505') {
    return { error: 'Ese producto ya está en la receta; editá su cantidad.' };
  }
  return { error: error?.message ?? null };
}

export async function updateItemQuantity(id: string, quantityG: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('recipe_items').update({ quantity_g: quantityG }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function removeItem(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('recipe_items').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteRecipe(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (!error) return { error: null };
  if (error.code === '23503') {
    return { error: 'Esta receta está usada en el diario. Borrá esos registros primero.' };
  }
  return { error: error.message };
}

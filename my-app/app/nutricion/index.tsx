import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct, MealSlot, NutritionGoals, NutritionLogMacros, RecipeNutrition } from '@/types/database';
import { todayStr, addDays, formatLong, isToday } from '@/lib/date';
import { MacroBar } from '@/components/nutricion/macro-bar';
import { AddEntryModal, type Pick } from '@/components/nutricion/add-entry-modal';
import {
  MEALS, MEAL_LABELS, GOAL_FIELDS, GOAL_LABELS, GOAL_UNITS,
  fetchDay, addEntry, deleteEntry, sumTotals, type DayTotals,
} from '@/lib/nutricion/diario';
import { fetchProducts } from '@/lib/nutricion/actions';
import { fetchRecipes } from '@/lib/nutricion/recetas';

export default function DiarioScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [day, setDay] = useState(todayStr());
  const [entries, setEntries] = useState<NutritionLogMacros[]>([]);
  const [totals, setTotals] = useState<DayTotals | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [recipes, setRecipes] = useState<RecipeNutrition[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<MealSlot | null>(null);

  const load = useCallback(async () => {
    const [dayRes, prodRes, recRes] = await Promise.all([
      fetchDay(day),
      fetchProducts(),
      fetchRecipes(),
    ]);
    if (dayRes.error) Alert.alert('Aviso', dayRes.error);
    setEntries(dayRes.entries);
    setTotals(dayRes.totals);
    setGoals(dayRes.goals);
    setProducts(prodRes.products);
    setRecipes(recRes.recipes);
    setLoading(false);
  }, [day]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async ({ pick, meal, quantityG }: { pick: Pick; meal: MealSlot; quantityG: number }) => {
    const { error } = await addEntry({
      productId: pick.kind === 'producto' ? pick.product.id : undefined,
      recipeId: pick.kind === 'receta' ? pick.recipe.recipe_id : undefined,
      loggedOn: day,
      meal,
      quantityG,
    });
    if (error) Alert.alert('No se pudo agregar', error);
    else load();
  };

  const confirmDelete = (e: NutritionLogMacros) =>
    Alert.alert('Quitar del diario', `¿Quitar ${e.source_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteEntry(e.id);
          if (error) Alert.alert('Aviso', error);
          else load();
        },
      },
    ]);

  const activeGoals = GOAL_FIELDS.filter((f) => goals?.[f] != null);
  const catalogIsEmpty = products.length === 0 && recipes.length === 0;

  return (
    <View style={s.flex}>
      <ScrollView style={s.flex} contentContainerStyle={s.content}>
        <View style={s.dayNav}>
          <TouchableOpacity onPress={() => setDay((d) => addDays(d, -1))} hitSlop={12}>
            <Text style={s.arrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.dayLabel}>
            <Text style={s.dayText}>{isToday(day) ? 'Hoy' : formatLong(day)}</Text>
            {isToday(day) ? <Text style={s.daySub}>{formatLong(day)}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => setDay((d) => addDays(d, 1))}
            hitSlop={12}
            disabled={isToday(day)}>
            <Text style={[s.arrow, isToday(day) && s.arrowOff]}>›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={s.loader} color={colors.accent} />
        ) : (
          <>
            <View style={s.card}>
              {activeGoals.length === 0 ? (
                <>
                  <Text style={s.noGoalTitle}>
                    {totals ? Math.round(totals.energy_kcal) : 0} kcal hoy
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/nutricion/objetivos')}>
                    <Text style={s.noGoalLink}>Definí tu objetivo diario para ver el avance →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                activeGoals.map((f) => (
                  <MacroBar
                    key={f}
                    label={GOAL_LABELS[f]}
                    consumed={totals?.[f] ?? 0}
                    goal={goals?.[f] ?? null}
                    unit={GOAL_UNITS[f]}
                  />
                ))
              )}
            </View>

            {MEALS.map((meal) => {
              const items = entries.filter((e) => e.meal === meal);
              const mealKcal = sumTotals(items).energy_kcal;
              return (
                <View key={meal} style={s.meal}>
                  <View style={s.mealHeader}>
                    <Text style={s.mealTitle}>{MEAL_LABELS[meal]}</Text>
                    <Text style={s.mealKcal}>{Math.round(mealKcal)} kcal</Text>
                  </View>

                  {items.map((e) => (
                    <TouchableOpacity key={e.id} style={s.entry} onLongPress={() => confirmDelete(e)}>
                      <View style={s.entryInfo}>
                        <Text style={s.entryName} numberOfLines={1}>{e.source_name}</Text>
                        <Text style={s.entryMeta}>
                          {e.quantity_g} g
                          {e.source_type === 'receta' ? ' · receta' : ''}
                          {'  ·  P '}{e.protein_g ?? 0}{'  C '}{e.carbs_g ?? 0}{'  G '}{e.fat_g ?? 0}
                        </Text>
                      </View>
                      <Text style={s.entryKcal}>{Math.round(e.energy_kcal ?? 0)}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={s.add}
                    onPress={() =>
                      catalogIsEmpty
                        ? Alert.alert(
                            'Catálogo vacío',
                            'Primero escaneá algún producto en la pestaña Productos.'
                          )
                        : setAdding(meal)
                    }>
                    <Text style={s.addText}>+ Agregar</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {entries.length > 0 && (
              <Text style={s.footnote}>Mantené pulsado un renglón para quitarlo.</Text>
            )}
          </>
        )}
      </ScrollView>

      <AddEntryModal
        visible={adding !== null}
        products={products}
        recipes={recipes}
        defaultMeal={adding ?? 'desayuno'}
        onClose={() => setAdding(null)}
        onAdd={handleAdd}
      />
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    loader: { marginTop: 40 },
    dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dayLabel: { alignItems: 'center' },
    dayText: { color: c.text, fontSize: 17, fontWeight: '700' },
    daySub: { color: c.textMuted, fontSize: 11, marginTop: 1 },
    arrow: { color: c.accent, fontSize: 30, fontWeight: '300', paddingHorizontal: 14 },
    arrowOff: { color: c.textMuted, opacity: 0.4 },
    card: {
      backgroundColor: c.surface, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 18,
    },
    noGoalTitle: { color: c.text, fontSize: 24, fontWeight: '800' },
    noGoalLink: { color: c.accent, fontSize: 13, marginTop: 8, fontWeight: '600' },
    meal: { marginBottom: 18 },
    mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    mealTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
    mealKcal: { color: c.textMuted, fontSize: 12 },
    entry: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 8, padding: 11, marginBottom: 6,
      borderWidth: 1, borderColor: c.border,
    },
    entryInfo: { flex: 1 },
    entryName: { color: c.text, fontSize: 14, fontWeight: '600' },
    entryMeta: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    entryKcal: { color: c.textSecondary, fontSize: 14, fontWeight: '700', marginLeft: 10 },
    add: {
      borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderDashed,
      borderRadius: 8, paddingVertical: 10, alignItems: 'center',
    },
    addText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    footnote: { color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  });

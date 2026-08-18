import { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct, MealSlot, RecipeNutrition } from '@/types/database';
import { MEALS, MEAL_LABELS } from '@/lib/nutricion/diario';
import { parseNum } from '@/lib/nutricion/actions';

export type Pick =
  | { kind: 'producto'; product: FoodProduct }
  | { kind: 'receta'; recipe: RecipeNutrition };

type Props = {
  visible: boolean;
  products: FoodProduct[];
  recipes: RecipeNutrition[];
  defaultMeal: MealSlot;
  onClose: () => void;
  onAdd: (params: { pick: Pick; meal: MealSlot; quantityG: number }) => void;
};

export function AddEntryModal({ visible, products, recipes, defaultMeal, onClose, onAdd }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  /**
   * Android encoge solo el diálogo del Modal; iOS no, y ahí el teclado se
   * comería la hoja entera.
   */
  const keyboardHeight = useKeyboardHeight();
  const sheetInset = Platform.OS === 'ios' ? keyboardHeight : 0;

  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<Pick | null>(null);
  const [meal, setMeal] = useState<MealSlot>(defaultMeal);
  const [grams, setGrams] = useState('');

  /**
   * La hoja no se desmonta al cerrarse, así que sin este sync `meal` se queda
   * con la comida elegida la vez anterior y lo agregado cae en la sección
   * equivocada. Al abrir mandan siempre los datos de la comida que se tocó.
   */
  useEffect(() => {
    if (!visible) return;
    setMeal(defaultMeal);
    setQuery('');
    setPick(null);
    setGrams('');
  }, [visible, defaultMeal]);

  const close = () => {
    setQuery(''); setPick(null); setGrams('');
    onClose();
  };

  const q = query.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);
  const shownProducts = products.filter((p) => matches(p.name) || matches(p.brand ?? ''));
  const shownRecipes = recipes.filter((r) => matches(r.name));

  const confirm = () => {
    const value = parseNum(grams);
    if (!value || value <= 0) return Alert.alert('Cantidad', 'Escribí cuántos gramos comiste.');
    if (!pick) return;
    onAdd({ pick, meal, quantityG: value });
    close();
  };

  // Atajo para no obligar a calcular mentalmente cuánto pesa una porción.
  const servingShortcut =
    pick?.kind === 'producto' && pick.product.serving_size_g
      ? { grams: pick.product.serving_size_g, label: pick.product.serving_label ?? `1 porción` }
      : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[s.backdrop, { paddingBottom: sheetInset }]}>
        <View style={[s.sheet, !pick && s.sheetSearching]}>
          <View style={s.header}>
            <TouchableOpacity onPress={close}><Text style={s.cancel}>Cancelar</Text></TouchableOpacity>
            <Text style={s.title}>{pick ? 'Cantidad' : 'Agregar al diario'}</Text>
            <View style={s.spacer} />
          </View>

          {!pick ? (
            <>
              <TextInput
                style={s.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar producto o receta…"
                placeholderTextColor={colors.placeholder}
                autoCorrect={false}
              />
              <ScrollView style={s.searchList} keyboardShouldPersistTaps="handled">
                {shownRecipes.length > 0 && <Text style={s.groupTitle}>Recetas</Text>}
                {shownRecipes.map((r) => (
                  <TouchableOpacity key={r.recipe_id} style={s.item} onPress={() => setPick({ kind: 'receta', recipe: r })}>
                    <Text style={s.itemName}>{r.name}</Text>
                    <Text style={s.itemMeta}>
                      {r.energy_kcal ?? '—'} kcal en {r.total_g} g
                    </Text>
                  </TouchableOpacity>
                ))}

                {shownProducts.length > 0 && <Text style={s.groupTitle}>Productos</Text>}
                {shownProducts.map((p) => (
                  <TouchableOpacity key={p.id} style={s.item} onPress={() => setPick({ kind: 'producto', product: p })}>
                    <Text style={s.itemName}>{p.name}</Text>
                    <Text style={s.itemMeta}>
                      {p.brand ? `${p.brand} · ` : ''}{p.energy_kcal ?? '—'} kcal /100 g
                    </Text>
                  </TouchableOpacity>
                ))}

                {shownProducts.length === 0 && shownRecipes.length === 0 && (
                  <Text style={s.empty}>Nada coincide con la búsqueda.</Text>
                )}
              </ScrollView>
            </>
          ) : (
            <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
              <Text style={s.picked}>
                {pick.kind === 'producto' ? pick.product.name : pick.recipe.name}
              </Text>
              <TouchableOpacity onPress={() => setPick(null)}>
                <Text style={s.change}>Elegir otro</Text>
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Comida</Text>
              <View style={s.meals}>
                {MEALS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[s.meal, meal === m && s.mealOn]}
                    onPress={() => setMeal(m)}>
                    <Text style={[s.mealText, meal === m && s.mealTextOn]}>{MEAL_LABELS[m]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Gramos consumidos</Text>
              <TextInput
                style={s.grams}
                value={grams}
                onChangeText={setGrams}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              {servingShortcut && (
                <TouchableOpacity onPress={() => setGrams(String(servingShortcut.grams))}>
                  <Text style={s.shortcut}>Usar {servingShortcut.label}</Text>
                </TouchableOpacity>
              )}
              {pick.kind === 'receta' && (
                <Text style={s.hint}>
                  La receta rinde {pick.recipe.total_g} g en total
                  {pick.recipe.yield_g ? ' (peso medido del preparado)' : ' (suma de ingredientes)'}.
                </Text>
              )}

              <TouchableOpacity style={s.primary} onPress={confirm}>
                <Text style={s.primaryText}>Agregar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: '88%',
      paddingBottom: 20,
    },
    /**
     * Mientras se busca, la hoja ocupa todo el alto disponible en vez de
     * ajustarse a los resultados: así la lista no aparece y desaparece
     * a cada tecla.
     */
    sheetSearching: { height: '88%' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    cancel: { color: c.accent, fontSize: 15, width: 80 },
    title: { flex: 1, textAlign: 'center', color: c.text, fontSize: 16, fontWeight: '700' },
    spacer: { width: 80 },
    search: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 16,
      color: c.text,
      fontSize: 15,
    },
    list: { paddingHorizontal: 16, marginTop: 12 },
    searchList: { flex: 1, paddingHorizontal: 16, marginTop: 12 },
    groupTitle: {
      color: c.textMuted, fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', marginTop: 10, marginBottom: 6,
    },
    item: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    itemName: { color: c.text, fontSize: 15, fontWeight: '600' },
    itemMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    empty: { color: c.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 },
    picked: { color: c.text, fontSize: 18, fontWeight: '700' },
    change: { color: c.accent, fontSize: 13, marginTop: 4, marginBottom: 8 },
    fieldLabel: { color: c.textSecondary, fontSize: 13, marginTop: 16, marginBottom: 7 },
    meals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    meal: {
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    mealOn: { backgroundColor: c.accent, borderColor: c.accent },
    mealText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    mealTextOn: { color: c.accentText },
    grams: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 12, color: c.text, fontSize: 20, fontWeight: '700',
    },
    shortcut: { color: c.accent, fontSize: 13, marginTop: 8, fontWeight: '600' },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
    primary: {
      backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14,
      alignItems: 'center', marginTop: 22,
    },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
  });

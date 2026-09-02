import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct, FoodState, MealSlot, NutritionGoals, RecipeNutrition } from '@/types/database';
import { MEALS, MEAL_LABELS, macrosFor, ZERO_TOTALS, type DayTotals } from '@/lib/nutricion/diario';
import { QuantityInput } from '@/components/nutricion/quantity-input';
import { ImpactPreview } from '@/components/nutricion/impact-preview';
import {
  convertQuantity, emptyQuantity, formatAmount, quantityToGrams, supportsUnits,
  unitName, unitWeight, type Quantity,
} from '@/lib/nutricion/unidades';
import {
  baseState, convertState, describeQuantity, FOOD_STATES, fromBaseGrams, stateLabel,
  stateRatio, stateTitle, supportsCooking, toBaseGrams,
} from '@/lib/nutricion/coccion';
import { parseNum } from '@/lib/nutricion/actions';

/** Tope de `nutrition_logs.quantity_g` en la base. */
const MAX_QUANTITY_G = 5000;

export type Pick =
  | { kind: 'producto'; product: FoodProduct }
  | { kind: 'receta'; recipe: RecipeNutrition };

type Props = {
  visible: boolean;
  products: FoodProduct[];
  recipes: RecipeNutrition[];
  defaultMeal: MealSlot;
  /** Lo que el día ya lleva, para poder simular contra eso. */
  dayTotals: DayTotals | null;
  goals: NutritionGoals | null;
  onClose: () => void;
  onAdd: (params: {
    pick: Pick;
    meal: MealSlot;
    /** Siempre en la forma base del producto: es lo que guarda la base. */
    quantityG: number;
    /** En qué forma se pesó, cuando el producto acepta las dos. */
    loggedState: FoodState | null;
  }) => void;
};

export function AddEntryModal({
  visible, products, recipes, defaultMeal, dayTotals, goals, onClose, onAdd,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  /**
   * Con edge-to-edge el diálogo del Modal tampoco se encoge en Android: RN lo
   * abre con la barra de navegación translúcida, la ventana queda a pantalla
   * completa y el teclado se dibuja encima de la hoja. Hay que apartarla a mano
   * en las dos plataformas.
   */
  const sheetInset = useKeyboardHeight();

  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<Pick | null>(null);
  const [meal, setMeal] = useState<MealSlot>(defaultMeal);
  /** Cantidad tal como se escribe: el texto y la unidad en la que está. */
  const [qty, setQty] = useState<Quantity>({ value: '', unit: 'g' });
  /** En qué forma se está pesando. null en lo que no distingue crudo de cocido. */
  const [state, setState] = useState<FoodState | null>(null);
  /** Si está abierta la simulación. Una vez abierta sigue lo que se teclea. */
  const [simulating, setSimulating] = useState(false);
  const formRef = useRef<ScrollView>(null);

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
    setQty({ value: '', unit: 'g' });
    setState(null);
    setSimulating(false);
  }, [visible, defaultMeal]);

  const close = () => {
    setQuery(''); setPick(null); setQty({ value: '', unit: 'g' });
    setState(null); setSimulating(false);
    onClose();
  };

  /**
   * Elegir qué se comió fija también con qué unidad se va a escribir cuánto:
   * la que diga la maestra del producto. Las recetas no tienen unidad propia,
   * se sirven en gramos.
   */
  const choose = (next: Pick) => {
    setPick(next);
    setQty(emptyQuantity(next.kind === 'producto' ? next.product : null));
    // Se abre en la forma en la que está cargado el producto: es la que la
    // balanza va a ver en la mayoría de los casos, y la que no convierte nada.
    setState(next.kind === 'producto' ? baseState(next.product) : null);
    // La simulación del alimento anterior no dice nada del nuevo.
    setSimulating(false);
  };

  const q = query.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);
  const shownProducts = products.filter((p) => matches(p.name) || matches(p.brand ?? ''));
  const shownRecipes = recipes.filter((r) => matches(r.name));

  /** El producto elegido, que es quien sabe la equivalencia unidad → gramos. */
  const spec = pick?.kind === 'producto' ? pick.product : null;
  /** El mismo producto, mirado por su conversión crudo ↔ cocido. */
  const cooking = spec;
  const base = baseState(cooking);
  /**
   * El selector solo aparece si la maestra trae los dos datos —forma base y
   * rendimiento— y solo mientras se escriba en gramos: el peso de una unidad
   * está en la forma base, así que contar huevos ya es pesar en esa forma.
   */
  const canPickState = supportsCooking(cooking) && qty.unit === 'g' && state !== null;

  /** Lo escrito llevado a la forma base, que es lo que se guarda y se calcula. */
  const toBase = (grams: number) => toBaseGrams(grams, state, cooking);

  /** Cambiar de forma conserva la comida, no el número: 100 g crudos → 250 cocidos. */
  const changeState = (next: FoodState) => {
    const from = state;
    setState(next);
    setQty((q) => {
      const grams = parseNum(q.value);
      if (!from || q.unit !== 'g' || grams === null) return q;
      return { ...q, value: formatAmount(convertState(grams, from, next, cooking)) };
    });
  };

  /**
   * Contar unidades y elegir la forma no se llevan: `unit_weight_g` está en la
   * forma base, así que al pasar a unidades se vuelve a ella. El conteo que
   * viene calculado contra los gramos de la otra forma se reescala, para que
   * "2 huevos" sigan siendo dos huevos.
   */
  const changeQty = (next: Quantity) => {
    if (next.unit === 'g' || !state || !base || state === base) return setQty(next);
    const counted = parseNum(next.value);
    setState(base);
    setQty(
      counted === null
        ? next
        : { ...next, value: formatAmount(counted * stateRatio(state, base, cooking)) }
    );
  };

  /**
   * Lo que sumaría lo escrito, recalculado a cada tecla mientras la simulación
   * esté abierta. `null` con el campo vacío: ahí no hay nada que proyectar.
   */
  const simulation = useMemo(() => {
    if (!simulating || !pick) return null;
    const written = quantityToGrams(qty, spec);
    if (written === null) return null;
    const grams = toBaseGrams(written, state, cooking);
    return {
      quantityLabel: describeQuantity({ baseG: grams, units: spec, cooking, loggedState: state }),
      added:
        pick.kind === 'producto'
          ? macrosFor(pick.product, 100, grams)
          : macrosFor(pick.recipe, pick.recipe.total_g, grams),
    };
  }, [simulating, pick, qty, spec, state, cooking]);

  const simulate = () => {
    if (simulating) return setSimulating(false);
    if (quantityToGrams(qty, spec) === null) {
      return Alert.alert('Cantidad', 'Escribí cuánto vas a comer para simularlo.');
    }
    setSimulating(true);
    // El panel nace debajo del botón, fuera de la hoja visible: sin esto la
    // simulación se abre donde el usuario no la ve.
    requestAnimationFrame(() => formRef.current?.scrollToEnd({ animated: true }));
  };

  const confirm = () => {
    if (!pick) return;
    const written = quantityToGrams(qty, spec);
    if (written === null) return Alert.alert('Cantidad', 'Escribí cuánto comiste.');
    const quantityG = toBase(written);
    // El mismo techo que tiene la columna en la base, avisado en castellano:
    // en unidades es fácil pasarse de un tecleo (300 huevos son 15 kg).
    if (quantityG > MAX_QUANTITY_G) {
      return Alert.alert('Cantidad', `Son ${formatAmount(quantityG)} g de una sentada. Revisá la cantidad.`);
    }
    onAdd({ pick, meal, quantityG, loggedState: supportsCooking(cooking) ? state : null });
    close();
  };

  // Atajo para no obligar a calcular mentalmente cuánto pesa una porción. Se
  // escribe en la unidad que esté activa: en un producto que va por unidades,
  // la porción de la etiqueta se ve como "1", no como "50".
  const servingShortcut =
    pick?.kind === 'producto' && pick.product.serving_size_g
      ? { grams: Number(pick.product.serving_size_g), label: pick.product.serving_label ?? `1 porción` }
      : null;

  // La porción de la etiqueta está en gramos de la forma base; si se está
  // pesando en la otra, se ofrece traducida a esa.
  const applyServing = (grams: number) =>
    setQty((q) =>
      convertQuantity(
        { value: String(fromBaseGrams(grams, state, cooking)), unit: 'g' },
        q.unit,
        spec
      )
    );

  /**
   * La cuenta que el usuario ya no tiene que hacer. Solo cuando de verdad hubo
   * conversión: repetir "150 g crudos son 150 g crudos" es ruido.
   */
  const stateEquivalence = (() => {
    if (!canPickState || !base || state === base) return null;
    const written = quantityToGrams(qty, spec);
    if (written === null || !state) return null;
    return `Son ${formatAmount(toBase(written))} g ${stateLabel(base, true)}, que es como se guarda.`;
  })();

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
                  <TouchableOpacity key={r.recipe_id} style={s.item} onPress={() => choose({ kind: 'receta', recipe: r })}>
                    <Text style={s.itemName}>{r.name}</Text>
                    <Text style={s.itemMeta}>
                      {r.energy_kcal ?? '—'} kcal en {r.total_g} g
                    </Text>
                  </TouchableOpacity>
                ))}

                {shownProducts.length > 0 && <Text style={s.groupTitle}>Productos</Text>}
                {shownProducts.map((p) => (
                  <TouchableOpacity key={p.id} style={s.item} onPress={() => choose({ kind: 'producto', product: p })}>
                    <Text style={s.itemName}>{p.name}</Text>
                    <Text style={s.itemMeta}>
                      {p.brand ? `${p.brand} · ` : ''}{p.energy_kcal ?? '—'} kcal /100 g
                      {p.base_state ? ` en ${stateLabel(p.base_state)}` : ''}
                      {supportsUnits(p)
                        ? ` · 1 ${unitName(p, 1)} = ${formatAmount(unitWeight(p) ?? 0)} g`
                        : ''}
                    </Text>
                  </TouchableOpacity>
                ))}

                {shownProducts.length === 0 && shownRecipes.length === 0 && (
                  <Text style={s.empty}>Nada coincide con la búsqueda.</Text>
                )}
              </ScrollView>
            </>
          ) : (
            <ScrollView ref={formRef} style={s.list} keyboardShouldPersistTaps="handled">
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

              {canPickState && (
                <>
                  <Text style={s.fieldLabel}>Lo pesaste</Text>
                  <View style={s.meals}>
                    {FOOD_STATES.map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[s.meal, state === f && s.mealOn]}
                        onPress={() => changeState(f)}>
                        <Text style={[s.mealText, state === f && s.mealTextOn]}>
                          {stateTitle(f)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={s.fieldLabel}>Cantidad</Text>
              <QuantityInput spec={spec} quantity={qty} onChange={changeQty} autoFocus />
              {stateEquivalence ? <Text style={s.stateNote}>{stateEquivalence}</Text> : null}
              {servingShortcut && (
                <TouchableOpacity onPress={() => applyServing(servingShortcut.grams)}>
                  <Text style={s.shortcut}>Usar {servingShortcut.label}</Text>
                </TouchableOpacity>
              )}
              {pick.kind === 'receta' && (
                <Text style={s.hint}>
                  La receta rinde {pick.recipe.total_g} g en total
                  {pick.recipe.yield_g ? ' (peso medido del preparado)' : ' (suma de ingredientes)'}.
                </Text>
              )}

              <View style={s.actions}>
                <TouchableOpacity style={s.secondary} onPress={simulate}>
                  <Text style={s.secondaryText}>{simulating ? 'Ocultar' : 'Simular'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primary, s.primaryGrow]} onPress={confirm}>
                  <Text style={s.primaryText}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {simulating &&
                (simulation ? (
                  <ImpactPreview
                    totals={dayTotals ?? { ...ZERO_TOTALS }}
                    added={simulation.added}
                    goals={goals}
                    quantityLabel={simulation.quantityLabel}
                  />
                ) : (
                  <Text style={s.hint}>Escribí una cantidad para ver el aporte.</Text>
                ))}
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
    shortcut: { color: c.accent, fontSize: 13, marginTop: 8, fontWeight: '600' },
    stateNote: { color: c.textSecondary, fontSize: 13, marginTop: 8 },
    hint: { color: c.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
    primary: {
      backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14,
      alignItems: 'center',
    },
    /** El agregar manda: la simulación se queda con lo justo para su palabra. */
    primaryGrow: { flex: 1 },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    secondary: {
      borderRadius: 10, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center',
      borderWidth: 1, borderColor: c.accent, backgroundColor: c.surface,
    },
    secondaryText: { color: c.accent, fontSize: 16, fontWeight: '700' },
  });

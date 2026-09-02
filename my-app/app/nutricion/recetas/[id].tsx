import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct, Recipe, RecipeItemWithProduct, RecipeNutrition } from '@/types/database';
import { fetchProducts, parseNum } from '@/lib/nutricion/actions';
import { QuantityInput } from '@/components/nutricion/quantity-input';
import { stateLabel } from '@/lib/nutricion/coccion';
import {
  emptyQuantity, formatAmount, formatQuantityShort, quantityFromGrams, quantityToGrams,
  supportsUnits, type Quantity,
} from '@/lib/nutricion/unidades';
import {
  fetchRecipe, updateRecipe, addItem, updateItemQuantity, removeItem, deleteRecipe,
} from '@/lib/nutricion/recetas';

/** Tope de `recipe_items.quantity_g` en la base. */
const MAX_ITEM_G = 20000;

export default function RecetaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  /**
   * Con edge-to-edge el diálogo del Modal tampoco se encoge en Android: RN lo
   * abre con la barra de navegación translúcida, la ventana queda a pantalla
   * completa y el teclado se dibuja encima de la hoja. Hay que apartarla a mano
   * en las dos plataformas.
   */
  const sheetInset = useKeyboardHeight();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [items, setItems] = useState<RecipeItemWithProduct[]>([]);
  const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null);
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [yieldDraft, setYieldDraft] = useState('');
  /** Peso del preparado que ya está en la base (o que se acaba de mandar). */
  const sentYieldRef = useRef<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<FoodProduct | null>(null);
  /** Cantidad del ingrediente tal como se escribe: el texto y su unidad. */
  const [qty, setQty] = useState<Quantity>({ value: '', unit: 'g' });
  /** id del ingrediente que se está editando; null cuando se agrega uno nuevo. */
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [res, prods] = await Promise.all([fetchRecipe(id), fetchProducts()]);
    if (res.error) Alert.alert('Aviso', res.error);
    setRecipe(res.recipe);
    setItems(res.items);
    setNutrition(res.nutrition);
    const storedYield = res.recipe?.yield_g == null ? '' : String(res.recipe.yield_g);
    setYieldDraft(storedYield);
    sentYieldRef.current = storedYield;
    setProducts(prods.products);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ingredientsG = items.reduce((sum, it) => sum + Number(it.quantity_g), 0);

  const saveYield = async () => {
    if (!id) return;
    // Tocar «Guardar» con el campo enfocado dispara el onBlur y el onPress, uno
    // detrás del otro: sin esto se mandaba el mismo UPDATE dos veces.
    const raw = yieldDraft.trim();
    if (sentYieldRef.current === raw) return;

    const value = parseNum(yieldDraft);
    // La tabla exige `yield_g > 0` (o null): sin esto el 0 volvía como el texto
    // crudo del CHECK de Postgres.
    if (value !== null && value <= 0) {
      return Alert.alert(
        'Peso del preparado',
        'Tiene que ser mayor que 0. Dejalo vacío si no pesaste la olla.'
      );
    }
    sentYieldRef.current = raw;
    const { error } = await updateRecipe(id, { yield_g: value });
    if (error) {
      sentYieldRef.current = null; // que se pueda reintentar el mismo valor
      Alert.alert('Aviso', error);
    } else load();
  };

  const closeSheet = () => {
    setPicking(false); setPending(null); setQuery(''); setEditingId(null);
    setQty({ value: '', unit: 'g' });
  };

  /** Elegir el ingrediente fija la unidad con la que se escribe su cantidad. */
  const choose = (product: FoodProduct) => {
    setPending(product);
    setQty(emptyQuantity(product));
  };

  const confirmAddItem = async () => {
    if (!pending || !id) return;
    const value = quantityToGrams(qty, pending);
    if (value === null) return Alert.alert('Cantidad', 'Escribí cuánto va en la receta.');
    // El mismo techo que el CHECK de `recipe_items`, dicho en castellano.
    if (value > MAX_ITEM_G) {
      return Alert.alert(
        'Cantidad',
        `Son ${formatAmount(value)} g de un solo ingrediente. Revisá la cantidad.`
      );
    }

    const { error } = editingId
      ? await updateItemQuantity(editingId, value)
      : await addItem(id, pending.id, value, items.length);

    if (error) return Alert.alert('No se pudo guardar', error);
    closeSheet();
    load();
  };

  /**
   * Editar la cantidad abre la misma hoja, precargada. Antes esto usaba
   * Alert.prompt, que no existe en Android: la única salida era borrar el
   * ingrediente y volver a agregarlo.
   */
  const editQuantity = (item: RecipeItemWithProduct) => {
    setPending(item.food_products);
    setQty(quantityFromGrams(item.quantity_g, item.food_products));
    setEditingId(item.id);
    setPicking(true);
  };

  const confirmRemove = (item: RecipeItemWithProduct) =>
    Alert.alert('Quitar ingrediente', `¿Quitar ${item.food_products.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await removeItem(item.id);
          if (error) Alert.alert('Aviso', error);
          else load();
        },
      },
    ]);

  const confirmDeleteRecipe = () =>
    Alert.alert('Borrar receta', `¿Borrar “${recipe?.name}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const { error } = await deleteRecipe(id);
          if (error) Alert.alert('No se pudo borrar', error);
          else router.back();
        },
      },
    ]);

  const q = query.trim().toLowerCase();
  const usedIds = new Set(items.map((i) => i.product_id));
  const available = products.filter(
    (p) => !usedIds.has(p.id) && (!q || p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q))
  );

  if (loading) return <ActivityIndicator style={s.loader} color={colors.accent} />;

  return (
    <View style={s.flex}>
      <KeyboardAwareScrollView style={s.flex} contentContainerStyle={s.content}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>‹ Recetas</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDeleteRecipe}>
            <Text style={s.delete}>Borrar</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>{recipe?.name}</Text>

        <Text style={s.section}>Ingredientes</Text>
        {items.map((it) => (
          <TouchableOpacity
            key={it.id}
            style={s.item}
            onPress={() => editQuantity(it)}
            onLongPress={() => confirmRemove(it)}>
            <View style={s.itemInfo}>
              <Text style={s.itemName} numberOfLines={1}>{it.food_products.name}</Text>
              <Text style={s.itemMeta}>
                {Math.round((it.food_products.energy_kcal ?? 0) * Number(it.quantity_g) / 100)} kcal
                {/* Los gramos siguen a la vista: son la base del peso del preparado. */}
                {supportsUnits(it.food_products) ? ` · ${formatAmount(Number(it.quantity_g))} g` : ''}
              </Text>
            </View>
            {/* La forma va pegada al peso: un ingrediente cargado en crudo y
                pesado como cocido desvía todo el preparado. */}
            <Text style={s.itemGrams}>
              {formatQuantityShort(it.quantity_g, it.food_products)}
              {it.food_products.base_state ? ` ${stateLabel(it.food_products.base_state, true)}` : ''}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.add} onPress={() => setPicking(true)}>
          <Text style={s.addText}>+ Agregar ingrediente</Text>
        </TouchableOpacity>

        {items.length > 0 && (
          <>
            <Text style={s.section}>Peso del preparado</Text>
            <Text style={s.explain}>
              Los ingredientes suman {Math.round(ingredientsG)} g. Si al cocinar cambia el peso,
              pesá la olla al final y escribilo acá: es contra ese peso que se escala cada porción
              que te sirvas. En frío —ensaladas, batidos— dejalo vacío.
            </Text>
            <View style={s.yieldRow}>
              <TextInput
                style={s.yieldInput}
                value={yieldDraft}
                onChangeText={setYieldDraft}
                keyboardType="decimal-pad"
                placeholder={String(Math.round(ingredientsG))}
                placeholderTextColor={colors.placeholder}
                onBlur={saveYield}
              />
              <Text style={s.yieldUnit}>g</Text>
              <TouchableOpacity style={s.yieldSave} onPress={saveYield}>
                <Text style={s.yieldSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>

            {nutrition && (
              <View style={s.totals}>
                <Text style={s.totalsTitle}>
                  Total del preparado · {nutrition.total_g} g
                </Text>
                <Text style={s.totalsLine}>
                  {nutrition.energy_kcal ?? '—'} kcal · P {nutrition.protein_g ?? '—'} g ·
                  C {nutrition.carbs_g ?? '—'} g · G {nutrition.fat_g ?? '—'} g
                </Text>
                <Text style={s.totalsPer}>
                  Por 100 g servidos:{' '}
                  {nutrition.energy_kcal && nutrition.total_g
                    ? Math.round((nutrition.energy_kcal * 100) / nutrition.total_g)
                    : '—'}{' '}
                  kcal
                </Text>
              </View>
            )}
          </>
        )}

        {items.length > 0 && (
          <Text style={s.footnote}>
            Tocá un ingrediente para cambiar la cantidad, mantené pulsado para quitarlo.
          </Text>
        )}
      </KeyboardAwareScrollView>

      <Modal visible={picking} animationType="slide" transparent onRequestClose={() => setPicking(false)}>
        <View style={[s.backdrop, { paddingBottom: sheetInset }]}>
          <View style={[s.sheet, !pending && s.sheetSearching]}>
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={closeSheet}>
                <Text style={s.back}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={s.sheetTitle}>
                {pending ? (editingId ? 'Editar cantidad' : 'Cantidad') : 'Elegir producto'}
              </Text>
              <View style={{ width: 70 }} />
            </View>

            {!pending ? (
              <>
                <TextInput
                  style={s.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar en el catálogo…"
                  placeholderTextColor={colors.placeholder}
                />
                <ScrollView style={s.searchList} keyboardShouldPersistTaps="handled">
                  {available.length === 0 ? (
                    <Text style={s.empty}>
                      {products.length === 0
                        ? 'El catálogo está vacío: escaneá productos primero.'
                        : 'No queda ningún producto sin agregar que coincida.'}
                    </Text>
                  ) : (
                    available.map((p) => (
                      <TouchableOpacity key={p.id} style={s.item} onPress={() => choose(p)}>
                        <View style={s.itemInfo}>
                          <Text style={s.itemName}>{p.name}</Text>
                          <Text style={s.itemMeta}>
                            {p.brand ? `${p.brand} · ` : ''}{p.energy_kcal ?? '—'} kcal /100 g
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </>
            ) : (
              <View style={s.sheetList}>
                <Text style={s.pendingName}>{pending.name}</Text>
                <Text style={s.explain}>¿Cuánto va en la receta?</Text>
                <QuantityInput spec={pending} quantity={qty} onChange={setQty} autoFocus />
                <TouchableOpacity style={s.primary} onPress={confirmAddItem}>
                  <Text style={s.primaryText}>{editingId ? 'Guardar' : 'Agregar'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    loader: { marginTop: 60 },
    content: { padding: 16, paddingBottom: 48 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    back: { color: c.accent, fontSize: 15 },
    delete: { color: c.danger, fontSize: 14 },
    title: { color: c.text, fontSize: 24, fontWeight: '800', marginBottom: 6 },
    section: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8 },
    explain: { color: c.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
    item: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 8, padding: 12, marginBottom: 7,
      borderWidth: 1, borderColor: c.border,
    },
    itemInfo: { flex: 1 },
    itemName: { color: c.text, fontSize: 14, fontWeight: '600' },
    itemMeta: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    itemGrams: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
    add: {
      borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderDashed,
      borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 4,
    },
    addText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    yieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    yieldInput: {
      flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: c.text, fontSize: 16,
    },
    yieldUnit: { color: c.textMuted, fontSize: 14 },
    yieldSave: { backgroundColor: c.surfaceSecondary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 },
    yieldSaveText: { color: c.text, fontSize: 13, fontWeight: '600' },
    totals: {
      backgroundColor: c.accentBg, borderRadius: 10, padding: 14, marginTop: 16,
    },
    totalsTitle: { color: c.text, fontSize: 13, fontWeight: '700', marginBottom: 5 },
    totalsLine: { color: c.text, fontSize: 13, lineHeight: 19 },
    totalsPer: { color: c.textSecondary, fontSize: 12, marginTop: 5 },
    footnote: { color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: 22 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.background, borderTopLeftRadius: 18, borderTopRightRadius: 18,
      maxHeight: '85%', paddingBottom: 20,
    },
    /** Buscando, la hoja no se encoge con los resultados: la lista se volvía ilegible. */
    sheetSearching: { height: '85%' },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    sheetTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
    search: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 16, color: c.text, fontSize: 15,
    },
    sheetList: { paddingHorizontal: 16, marginTop: 12 },
    searchList: { flex: 1, paddingHorizontal: 16, marginTop: 12 },
    empty: { color: c.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 },
    pendingName: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
    primary: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
  });

import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import type { AppColorScheme } from '@/constants/theme';
import type { Recipe, RecipeNutrition } from '@/types/database';
import { fetchRecipes, createRecipe } from '@/lib/nutricion/recetas';

export default function RecetasScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [recipes, setRecipes] = useState<RecipeNutrition[]>([]);
  const [empty, setEmpty] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  /**
   * La barra de creación va anclada al fondo de la escena, que arranca arriba
   * del tab bar. El teclado tapa desde el fondo de la ventana, así que solo
   * hay que subirla lo que tape de más.
   */
  const tabBarHeight = useBottomTabBarHeight();
  const keyboardHeight = useKeyboardHeight();
  const lift = Math.max(0, keyboardHeight - tabBarHeight);

  const load = useCallback(async () => {
    const { recipes, empty, error } = await fetchRecipes();
    if (error) Alert.alert('Aviso', error);
    setRecipes(recipes);
    setEmpty(empty);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    if (!name.trim()) return;
    const { id, error } = await createRecipe(name);
    if (error || !id) return Alert.alert('No se pudo crear', error ?? 'Error');
    setName('');
    setCreating(false);
    router.push(`/nutricion/recetas/${id}`);
  };

  return (
    <View style={s.flex}>
      <ScrollView style={s.flex} contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator style={s.loader} color={colors.accent} />
        ) : recipes.length === 0 && empty.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Sin recetas todavía</Text>
            <Text style={s.emptyText}>
              Una receta junta varios productos del catálogo. Cuando la registres en el
              diario, escribís cuántos gramos te serviste y los macros se escalan solos.
            </Text>
          </View>
        ) : (
          <>
            {recipes.map((r) => (
              <TouchableOpacity
                key={r.recipe_id}
                style={s.card}
                onPress={() => router.push(`/nutricion/recetas/${r.recipe_id}`)}>
                <View style={s.cardInfo}>
                  <Text style={s.name}>{r.name}</Text>
                  <Text style={s.meta}>
                    {r.energy_kcal ?? '—'} kcal en {r.total_g} g
                    {r.yield_g ? ' (pesado)' : ''}
                  </Text>
                  <Text style={s.macros}>
                    P {r.protein_g ?? '—'} · C {r.carbs_g ?? '—'} · G {r.fat_g ?? '—'}
                  </Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
            {empty.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[s.card, s.cardEmpty]}
                onPress={() => router.push(`/nutricion/recetas/${r.id}`)}>
                <View style={s.cardInfo}>
                  <Text style={s.name}>{r.name}</Text>
                  <Text style={s.metaEmpty}>Sin ingredientes todavía</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {creating ? (
        <View style={[s.createBar, { bottom: lift }]}>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la receta"
            placeholderTextColor={colors.placeholder}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
            <Text style={s.createBtnText}>Crear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCreating(false); setName(''); }}>
            <Text style={s.cancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.fab} onPress={() => setCreating(true)}>
          <Text style={s.fabText}>Nueva receta</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 90 },
    loader: { marginTop: 40 },
    emptyState: { marginTop: 50, paddingHorizontal: 8 },
    emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    emptyText: { color: c.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 10, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: c.border,
    },
    cardEmpty: { borderStyle: 'dashed', borderColor: c.borderDashed },
    cardInfo: { flex: 1 },
    name: { color: c.text, fontSize: 15, fontWeight: '600' },
    meta: { color: c.textSecondary, fontSize: 12, marginTop: 3 },
    metaEmpty: { color: c.textMuted, fontSize: 12, marginTop: 3, fontStyle: 'italic' },
    macros: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    chevron: { color: c.textMuted, fontSize: 22, fontWeight: '300' },
    fab: {
      position: 'absolute', left: 16, right: 16, bottom: 16,
      backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    },
    fabText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    createBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
      padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    input: {
      flex: 1, backgroundColor: c.background, borderWidth: 1, borderColor: c.border,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, color: c.text, fontSize: 15,
    },
    createBtn: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
    createBtnText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
    cancel: { color: c.textSecondary, fontSize: 13 },
  });

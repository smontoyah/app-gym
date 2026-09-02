import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct } from '@/types/database';
import { fetchProducts, signPhotoUrls, deleteProduct } from '@/lib/nutricion/actions';
import { stateLabel } from '@/lib/nutricion/coccion';

export default function CatalogoScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [choosing, setChoosing] = useState(false);

  const load = useCallback(async () => {
    const { products, error } = await fetchProducts();
    if (error) Alert.alert('Aviso', error);
    setProducts(products);
    setUrls(await signPhotoUrls(products.map((p) => p.front_photo_path ?? '').filter(Boolean)));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    // Busca por nombre y por marca: "alpina" tiene que traer los yogures aunque
    // el nombre no la mencione.
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q)
    );
  }, [products, query]);

  const go = (route: '/nutricion/catalogo/escanear' | '/nutricion/catalogo/manual') => {
    setChoosing(false);
    router.push(route);
  };

  const confirmDelete = (p: FoodProduct) =>
    Alert.alert('Borrar producto', `¿Borrar “${p.name}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteProduct(p.id);
          if (error) Alert.alert('No se pudo borrar', error);
          else load();
        },
      },
    ]);

  return (
    <View style={s.flex}>
      {/* El buscador vive fuera del ScrollView para no perderlo al bajar la lista. */}
      {!loading && products.length > 0 && (
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o marca"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {loading ? (
          <ActivityIndicator style={s.loader} color={colors.accent} />
        ) : products.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Todavía no hay productos</Text>
            <Text style={s.emptyText}>
              Escaneá la tabla nutricional de algo que tengas en la cocina, o cargalo a
              mano. Cada producto se carga una sola vez, queda disponible para todos y
              después se reutiliza en el diario y en las recetas.
            </Text>
          </View>
        ) : shown.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Sin resultados</Text>
            <Text style={s.emptyText}>Ningún producto coincide con “{query.trim()}”.</Text>
          </View>
        ) : (
          shown.map((p) => {
            const url = p.front_photo_path ? urls[p.front_photo_path] : undefined;
            return (
              <TouchableOpacity
                key={p.id}
                style={s.card}
                onPress={() => router.push(`/nutricion/catalogo/${p.id}`)}
                onLongPress={p.user_id === user?.id ? () => confirmDelete(p) : undefined}>
                {url ? (
                  // cacheKey estable: la URL firmada cambia en cada refresco y sin
                  // esto expo-image volvería a descargar la miniatura cada sesión.
                  <Image
                    source={{ uri: url, cacheKey: p.front_photo_path ?? undefined }}
                    style={s.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]} />
                )}
                <View style={s.info}>
                  <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                  {p.brand ? <Text style={s.brand} numberOfLines={1}>{p.brand}</Text> : null}
                  <Text style={s.macros}>
                    {p.energy_kcal ?? '—'} kcal · P {p.protein_g ?? '—'} · C {p.carbs_g ?? '—'} · G {p.fat_g ?? '—'}
                    {/* La forma es parte de la base: 100 g de arroz seco y 100 g
                        del mismo arroz cocido no son el mismo renglón. */}
                    <Text style={s.per}>  /100 g{p.base_state ? ` en ${stateLabel(p.base_state)}` : ''}</Text>
                  </Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setChoosing(true)}>
        <Text style={s.fabText}>Nuevo producto</Text>
      </TouchableOpacity>

      <Modal
        visible={choosing}
        animationType="slide"
        transparent
        onRequestClose={() => setChoosing(false)}>
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={() => setChoosing(false)}>
          {/* activeOpacity=1 sin onPress: absorbe el tap para que tocar la hoja no la cierre. */}
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <Text style={s.sheetTitle}>Nuevo producto</Text>

            <TouchableOpacity style={s.option} onPress={() => go('/nutricion/catalogo/escanear')}>
              <Text style={s.optionTitle}>Escanear etiqueta</Text>
              <Text style={s.optionHint}>
                Foto de la tabla nutricional y del frente; la app las lee y llena los campos.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.option} onPress={() => go('/nutricion/catalogo/manual')}>
              <Text style={s.optionTitle}>Ingresar a mano</Text>
              <Text style={s.optionHint}>
                Tomás una foto si querés y escribís vos los valores por 100 g.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.sheetCancel} onPress={() => setChoosing(false)}>
              <Text style={s.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 90 },
    loader: { marginTop: 40 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.surfaceSecondary,
    },
    searchIcon: { fontSize: 13 },
    searchInput: { flex: 1, color: c.text, fontSize: 14, paddingVertical: 10 },
    searchClear: { color: c.textMuted, fontSize: 14, paddingHorizontal: 2 },
    empty: { marginTop: 60, paddingHorizontal: 12 },
    emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    emptyText: { color: c.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: c.surfaceSecondary },
    thumbEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderDashed },
    info: { flex: 1, marginLeft: 12 },
    name: { color: c.text, fontSize: 15, fontWeight: '600' },
    brand: { color: c.textSecondary, fontSize: 12, marginTop: 1 },
    macros: { color: c.textSecondary, fontSize: 12, marginTop: 4 },
    per: { color: c.textMuted },
    chevron: { color: c.textMuted, fontSize: 22, fontWeight: '300', marginLeft: 6 },
    fab: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    fabText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 28,
    },
    sheetTitle: { color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
    option: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
    },
    optionTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
    optionHint: { color: c.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 17 },
    sheetCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
    sheetCancelText: { color: c.accent, fontSize: 15, fontWeight: '600' },
  });

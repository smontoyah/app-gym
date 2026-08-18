import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct } from '@/types/database';
import { fetchProducts, signPhotoUrls, deleteProduct } from '@/lib/nutricion/actions';

export default function CatalogoScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { products, error } = await fetchProducts();
    if (error) Alert.alert('Aviso', error);
    setProducts(products);
    setUrls(await signPhotoUrls(products.map((p) => p.front_photo_path ?? '').filter(Boolean)));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      <ScrollView style={s.flex} contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator style={s.loader} color={colors.accent} />
        ) : products.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Todavía no hay productos</Text>
            <Text style={s.emptyText}>
              Escaneá la tabla nutricional de algo que tengas en la cocina. Cada producto
              se escanea una sola vez y después lo reutilizás en el diario y en las recetas.
            </Text>
          </View>
        ) : (
          products.map((p) => {
            const url = p.front_photo_path ? urls[p.front_photo_path] : undefined;
            return (
              <TouchableOpacity key={p.id} style={s.card} onLongPress={() => confirmDelete(p)}>
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
                    <Text style={s.per}>  /100 g</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => router.push('/nutricion/catalogo/escanear')}>
        <Text style={s.fabText}>Escanear producto</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 90 },
    loader: { marginTop: 40 },
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
  });

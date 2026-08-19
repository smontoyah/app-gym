import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodProduct } from '@/types/database';
import { ProductFields } from '@/components/nutricion/product-fields';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import {
  fetchProduct, productToDraft, updateProduct, deleteProduct, signPhotoUrls,
} from '@/lib/nutricion/actions';
import type { ProductDraft } from '@/lib/nutricion/types';

export default function ProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { product, error } = await fetchProduct(id);
    if (error || !product) {
      Alert.alert('No se pudo abrir', error ?? 'Producto no encontrado.');
      return router.back();
    }
    setProduct(product);
    setDraft(productToDraft(product));
    setUrls(
      await signPhotoUrls(
        [product.label_photo_path, product.front_photo_path].filter(Boolean) as string[]
      )
    );
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: keyof ProductDraft) => (v: string) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const handleSave = async () => {
    if (!id || !draft) return;
    setSaving(true);
    const { error } = await updateProduct(id, draft);
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert('Borrar producto', `¿Borrar “${product?.name}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const { error } = await deleteProduct(id);
          if (error) Alert.alert('No se pudo borrar', error);
          else router.back();
        },
      },
    ]);

  if (loading || !draft || !product) {
    return <ActivityIndicator style={s.loader} color={colors.accent} />;
  }

  const photos = [
    { path: product.front_photo_path, label: 'Frente' },
    { path: product.label_photo_path, label: 'Tabla' },
  ].filter((p) => p.path && urls[p.path]);

  return (
    <KeyboardAwareScrollView style={s.flex} contentContainerStyle={s.content}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>‹ Productos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete}>
          <Text style={s.delete}>Borrar</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <View style={s.photos}>
          {photos.map((p) => (
            <View key={p.path} style={s.photoWrap}>
              {/* cacheKey estable: la URL firmada cambia en cada refresco. */}
              <Image
                source={{ uri: urls[p.path!], cacheKey: p.path! }}
                style={s.photo}
                contentFit="cover"
              />
              <Text style={s.photoLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      )}

      <ProductFields draft={draft} onChange={set} />

      <TouchableOpacity style={[s.primary, saving && s.disabled]} onPress={handleSave} disabled={saving}>
        <Text style={s.primaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
      </TouchableOpacity>

      {product.ocr_model && (
        <Text style={s.footnote}>
          Leído con {product.ocr_model}
          {product.ocr_confidence != null
            ? ` · confianza ${Math.round(Number(product.ocr_confidence) * 100)}%`
            : ''}
        </Text>
      )}
    </KeyboardAwareScrollView>
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
    photos: { flexDirection: 'row', gap: 10, marginBottom: 6 },
    photoWrap: { flex: 1 },
    photo: { width: '100%', height: 150, borderRadius: 10, backgroundColor: c.surfaceSecondary },
    photoLabel: { color: c.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
    primary: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.45 },
    footnote: { color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: 14 },
  });

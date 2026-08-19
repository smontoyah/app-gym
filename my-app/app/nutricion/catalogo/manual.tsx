import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { PhotoSlot } from '@/components/nutricion/photo-slot';
import { ProductFields } from '@/components/nutricion/product-fields';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { capture, type Shot } from '@/lib/nutricion/scan';
import { saveProduct } from '@/lib/nutricion/actions';
import { EMPTY_DRAFT, type ProductDraft } from '@/lib/nutricion/types';

export default function ManualScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [front, setFront] = useState<Shot | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);

  const set = (k: keyof ProductDraft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const pickFront = async (from: 'camera' | 'library') => {
    const { shot, error } = await capture('front', from);
    if (error) return Alert.alert('Aviso', error);
    if (shot) setFront(shot);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      return Alert.alert('Falta el nombre', 'Escribí al menos cómo se llama el producto.');
    }
    setSaving(true);
    // Sin OCR: no hay `ocr_raw` ni modelo que registrar, los valores los puso el usuario.
    const { error, photoWarning } = await saveProduct({
      draft, ocr: null, model: null, label: null, front,
    });
    setSaving(false);

    if (error) return Alert.alert('No se pudo guardar', error);
    if (photoWarning) Alert.alert('Guardado con avisos', photoWarning);
    router.back();
  };

  return (
    <KeyboardAwareScrollView style={s.flex} contentContainerStyle={s.content}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancel}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>Producto a mano</Text>
        <View style={s.spacer} />
      </View>

      <PhotoSlot
        title="Foto del producto"
        hint="Opcional, pero es lo que después vas a reconocer en la lista."
        shot={front}
        disabled={saving}
        onPick={pickFront}
        onClear={() => setFront(null)}
      />

      <ProductFields
        draft={draft}
        onChange={set}
        hint="Todo se guarda por 100 g: es la única base que deja sumar productos distintos y escalar por los gramos que realmente comas. Lo que no sepas, dejalo vacío."
      />

      <TouchableOpacity
        style={[s.primary, saving && s.disabled]}
        disabled={saving}
        onPress={handleSave}>
        <Text style={s.primaryText}>{saving ? 'Guardando…' : 'Guardar producto'}</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 48 },
    topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    cancel: { color: c.accent, fontSize: 15, width: 80 },
    screenTitle: { flex: 1, textAlign: 'center', color: c.text, fontSize: 17, fontWeight: '700' },
    spacer: { width: 80 },
    primary: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 22,
    },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.45 },
  });

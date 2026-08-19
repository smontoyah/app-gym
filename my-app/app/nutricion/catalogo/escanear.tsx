import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { PhotoSlot } from '@/components/nutricion/photo-slot';
import { ProductFields } from '@/components/nutricion/product-fields';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { capture, runOcr, toPer100g, type PhotoKind, type Shot } from '@/lib/nutricion/scan';
import { saveProduct } from '@/lib/nutricion/actions';
import {
  EMPTY_DRAFT, MACRO_FIELDS,
  type DraftSetter, type MacroField, type OcrMacros, type OcrResult, type ProductDraft,
} from '@/lib/nutricion/types';

const str = (v: number | string | null | undefined) => (v == null ? '' : String(v));

/**
 * Lo leído, volcado al formulario. Las macros son aparte porque pueden faltar:
 * si la etiqueta no traía la columna por 100 g ni la porción para convertirla,
 * el resto (nombre, marca, porción, envase) sí se leyó y sería absurdo hacerlo
 * retipear.
 */
function draftFromOcr(data: OcrResult, macros: OcrMacros | null): ProductDraft {
  return {
    ...EMPTY_DRAFT,
    name: data.product_name ?? '',
    brand: data.brand ?? '',
    package_size_g: str(data.package_size_g),
    serving_size_g: str(data.serving_size_g),
    serving_label: data.serving_label ?? '',
    servings_per_package: str(data.servings_per_package),
    ...(macros
      ? (Object.fromEntries(
          MACRO_FIELDS.map((f) => [f, str(macros[f])])
        ) as Record<MacroField, string>)
      : {}),
  };
}

/**
 * Un campo que el modelo declaró ilegible. Se compara el último segmento con el
 * sufijo de unidad afuera: con `includes`, un `added_sugars_g` ilegible marcaba
 * también `sugars_g`, y `saturated_fat_g` marcaba `fat_g`.
 */
const fieldKey = (name: string) =>
  (name.trim().toLowerCase().split('.').pop() ?? '').replace(/_(g|mg|ug|kcal|kj)$/, '');

export default function EscanearScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [label, setLabel] = useState<Shot | null>(null);
  const [front, setFront] = useState<Shot | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [derived, setDerived] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);

  const reviewing = ocr !== null;
  const set: DraftSetter = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const flagged = (name: string) =>
    !!ocr?.unreadable_fields?.some((f) => fieldKey(f) === fieldKey(name));

  const pick = (kind: PhotoKind) => async (from: 'camera' | 'library') => {
    const { shot, error } = await capture(kind, from);
    if (error) return Alert.alert('Aviso', error);
    if (!shot) return;
    (kind === 'label' ? setLabel : setFront)(shot);
  };

  const handleScan = async () => {
    if (!label || !front) return;
    setScanning(true);
    const { result, error } = await runOcr(label, front);
    setScanning(false);

    if (error || !result) {
      return Alert.alert('No se pudo leer la etiqueta', error ?? 'Error desconocido');
    }

    const data = result.data;
    const { macros, derived: wasDerived } = toPer100g(data);

    if (!macros) {
      return Alert.alert(
        'Faltan las macros',
        'El modelo no encontró la columna por 100 g y tampoco el tamaño de porción para convertirla. El resto de lo que leyó queda cargado; las macros escribilas a mano.',
        [
          {
            text: 'Llenar a mano',
            onPress: () => {
              setOcr(data);
              setModel(result.meta.model);
              setDerived(false);
              setDraft(draftFromOcr(data, null));
            },
          },
        ]
      );
    }

    setOcr(data);
    setModel(result.meta.model);
    setDerived(wasDerived);
    setDraft(draftFromOcr(data, macros));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error, photoWarning } = await saveProduct({ draft, ocr, model, label, front });
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
        <Text style={s.screenTitle}>{reviewing ? 'Revisar' : 'Escanear producto'}</Text>
        <View style={s.spacer} />
      </View>

      {!reviewing && (
        <>
          <PhotoSlot
            title="1 · Tabla nutricional"
            hint="Encuadrá la tabla completa, lo más de frente posible."
            shot={label}
            disabled={scanning}
            onPick={pick('label')}
            onClear={() => setLabel(null)}
          />
          <PhotoSlot
            title="2 · Frente del empaque"
            hint="Para reconocerlo en el estante, y de acá salen la marca y el nombre."
            shot={front}
            disabled={scanning}
            onPick={pick('front')}
            onClear={() => setFront(null)}
          />

          <TouchableOpacity
            style={[s.primary, (!label || !front || scanning) && s.disabled]}
            disabled={!label || !front || scanning}
            onPress={handleScan}>
            {scanning ? (
              <View style={s.row}>
                <ActivityIndicator color={colors.accentText} />
                <Text style={s.primaryText}>  Leyendo la etiqueta…</Text>
              </View>
            ) : (
              <Text style={s.primaryText}>Leer etiqueta</Text>
            )}
          </TouchableOpacity>

          {!label || !front ? (
            <Text style={s.footnote}>Hacen falta las dos fotos.</Text>
          ) : null}
        </>
      )}

      {reviewing && ocr && (
        <>
          {derived && (
            <View style={[s.banner, s.bannerWarn]}>
              <Text style={s.bannerText}>
                La etiqueta solo traía la columna por porción. Los valores de abajo se
                convirtieron a 100 g usando la porción de {ocr.serving_size_g} g.
              </Text>
            </View>
          )}
          {!ocr.brand && ocr.brand_visible_text && (
            <View style={s.banner}>
              <Text style={s.bannerText}>
                No se pudo leer la marca completa; en el logo se alcanza a ver
                “{ocr.brand_visible_text}”. Completala vos.
              </Text>
            </View>
          )}
          {ocr.notes && (
            <View style={s.banner}>
              <Text style={s.bannerText}>{ocr.notes}</Text>
            </View>
          )}

          <ProductFields
            draft={draft}
            onChange={set}
            flagged={flagged}
            hint="Todo se guarda por 100 g: es la única base que deja sumar productos distintos y escalar por los gramos que realmente comas."
          />

          <TouchableOpacity
            style={[s.primary, saving && s.disabled]}
            disabled={saving}
            onPress={handleSave}>
            <Text style={s.primaryText}>{saving ? 'Guardando…' : 'Guardar producto'}</Text>
          </TouchableOpacity>
          <Text style={s.footnote}>
            Confianza del modelo: {Math.round((ocr.confidence ?? 0) * 100)}%
          </Text>
        </>
      )}
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
    row: { flexDirection: 'row', alignItems: 'center' },
    primary: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.45 },
    footnote: { color: c.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },
    banner: {
      backgroundColor: c.accentBg,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    bannerWarn: { backgroundColor: c.warningBg },
    bannerText: { color: c.text, fontSize: 13, lineHeight: 18 },
  });

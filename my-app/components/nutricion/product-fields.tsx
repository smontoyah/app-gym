import { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { Field } from './field';
import { MACRO_FIELDS, MACRO_LABELS, type ProductDraft } from '@/lib/nutricion/types';

type Props = {
  draft: ProductDraft;
  onChange: (k: keyof ProductDraft) => (v: string) => void;
  /** Devuelve true si el OCR declaró ilegible ese campo: se resalta para revisión. */
  flagged?: (field: string) => boolean;
  /** Nota bajo "Por 100 g"; solo se muestra donde hace falta explicar la base. */
  hint?: string;
};

/**
 * Los mismos campos aparecen al escanear, al cargar a mano y al editar un
 * producto guardado. Tenerlos en un solo lugar evita que las tres pantallas se
 * desincronicen cuando cambie una etiqueta o se agregue una macro.
 */
export function ProductFields({ draft, onChange, flagged, hint }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const flag = (name: string) => flagged?.(name) ?? false;

  return (
    <>
      <Text style={s.section}>Producto</Text>
      <Field label="Nombre" value={draft.name} onChange={onChange('name')} flagged={flag('product_name')} placeholder="Arroz blanco cocido" />
      <Field label="Marca" value={draft.brand} onChange={onChange('brand')} flagged={flag('brand')} placeholder="Sin marca" />
      <Field label="Porción (como dice la etiqueta)" value={draft.serving_label} onChange={onChange('serving_label')} placeholder="1 cucharada (15 g)" />
      <Field label="Gramos por porción" value={draft.serving_size_g} onChange={onChange('serving_size_g')} numeric suffix="g" flagged={flag('serving_size')} />
      <Field label="Contenido del envase" value={draft.package_size_g} onChange={onChange('package_size_g')} numeric suffix="g" />
      <Field label="Porciones por envase" value={draft.servings_per_package} onChange={onChange('servings_per_package')} numeric />

      <Text style={s.section}>Por 100 g</Text>
      {hint ? <Text style={s.sectionHint}>{hint}</Text> : null}
      {MACRO_FIELDS.map((f) => (
        <Field
          key={f}
          label={MACRO_LABELS[f]}
          value={draft[f]}
          onChange={onChange(f)}
          numeric
          flagged={flag(f)}
        />
      ))}
    </>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    section: { color: c.text, fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
    sectionHint: { color: c.textMuted, fontSize: 12, marginBottom: 12, marginTop: -4, lineHeight: 17 },
  });

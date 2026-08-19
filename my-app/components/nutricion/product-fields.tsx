import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { IntakeUnit } from '@/types/database';
import { Field } from './field';
import {
  MACRO_FIELDS, MACRO_LABELS, type DraftSetter, type ProductDraft,
} from '@/lib/nutricion/types';

type Props = {
  draft: ProductDraft;
  onChange: DraftSetter;
  /** Devuelve true si el OCR declaró ilegible ese campo: se resalta para revisión. */
  flagged?: (field: string) => boolean;
  /** Nota bajo "Por 100 g"; solo se muestra donde hace falta explicar la base. */
  hint?: string;
  /**
   * false cuando el producto lo cargó otro usuario: el catálogo es compartido
   * en lectura, no en escritura. Los mismos campos sirven de ficha de consulta.
   */
  editable?: boolean;
};

const INTAKE_UNITS: { unit: IntakeUnit; label: string }[] = [
  { unit: 'g', label: 'Gramos' },
  { unit: 'unidad', label: 'Unidades' },
];

/**
 * Los mismos campos aparecen al escanear, al cargar a mano y al editar un
 * producto guardado. Tenerlos en un solo lugar evita que las tres pantallas se
 * desincronicen cuando cambie una etiqueta o se agregue una macro.
 */
export function ProductFields({ draft, onChange, flagged, hint, editable = true }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const flag = (name: string) => flagged?.(name) ?? false;

  return (
    <>
      <Text style={s.section}>Producto</Text>
      <Field label="Nombre" value={draft.name} onChange={onChange('name')} flagged={flag('product_name')} placeholder="Arroz blanco cocido" editable={editable} />
      <Field label="Marca" value={draft.brand} onChange={onChange('brand')} flagged={flag('brand')} placeholder="Sin marca" editable={editable} />
      <Field label="Porción (como dice la etiqueta)" value={draft.serving_label} onChange={onChange('serving_label')} placeholder="1 cucharada (15 g)" editable={editable} />
      <Field label="Gramos por porción" value={draft.serving_size_g} onChange={onChange('serving_size_g')} numeric suffix="g" flagged={flag('serving_size')} editable={editable} />
      <Field label="Contenido del envase" value={draft.package_size_g} onChange={onChange('package_size_g')} numeric suffix="g" editable={editable} />
      <Field label="Porciones por envase" value={draft.servings_per_package} onChange={onChange('servings_per_package')} numeric editable={editable} />

      <Text style={s.section}>Cómo se ingresa</Text>
      <Text style={s.sectionHint}>
        Con qué unidad se escribe la cantidad en el diario. Los cálculos siguen siendo en
        gramos: si una galleta pesa 6,5 g, cuatro galletas se guardan como 26 g.
      </Text>
      <View style={s.chips}>
        {INTAKE_UNITS.map(({ unit, label }) => {
          const on = draft.intake_unit === unit;
          return (
            <TouchableOpacity
              key={unit}
              style={[s.chip, on && s.chipOn, !editable && !on && s.chipOff]}
              disabled={!editable}
              onPress={() => onChange('intake_unit')(unit)}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {draft.intake_unit === 'unidad' && (
        <View style={s.unitFields}>
          <Text style={s.sectionHint}>
            Es el peso de UNA sola, no el de la porción de la etiqueta: “5 galletas (32,5 g)”
            son 6,5 g por galleta.
          </Text>
          <Field
            label="Peso de una unidad"
            value={draft.unit_weight_g}
            onChange={onChange('unit_weight_g')}
            numeric
            suffix="g"
            placeholder="50"
            editable={editable}
          />
          <Field
            label="Cómo se llama la unidad (opcional)"
            value={draft.unit_label}
            onChange={onChange('unit_label')}
            placeholder="huevo, galleta, arepa…"
            editable={editable}
          />
        </View>
      )}

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
          editable={editable}
        />
      ))}
    </>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    section: { color: c.text, fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
    sectionHint: { color: c.textMuted, fontSize: 12, marginBottom: 12, marginTop: -4, lineHeight: 17 },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    chip: {
      paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    chipOn: { backgroundColor: c.accent, borderColor: c.accent },
    // En consulta, la unidad que NO es la del producto no debe competir con la
    // elegida: sin esto las dos se ven igual de disponibles.
    chipOff: { opacity: 0.4 },
    chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextOn: { color: c.accentText },
    unitFields: { marginTop: 2 },
  });

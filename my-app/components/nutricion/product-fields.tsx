import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { FoodState, IntakeUnit } from '@/types/database';
import { Field } from './field';
import {
  MACRO_FIELDS, MACRO_LABELS, type DraftSetter, type ProductDraft,
} from '@/lib/nutricion/types';
import { FOOD_STATES, stateLabel, stateTitle, yieldSummary } from '@/lib/nutricion/coccion';
import { parseNum } from '@/lib/nutricion/actions';

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

/** null es una opción de verdad: la mayoría de los empacados no se cocinan. */
const BASE_STATES: { state: FoodState | null; label: string }[] = [
  { state: null, label: 'No aplica' },
  ...FOOD_STATES.map((state) => ({ state, label: stateTitle(state) })),
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

  // Lo que el número escrito significa en la cocina, dicho mientras se escribe:
  // "250" no se lee solo, "gana 150 % de peso" sí.
  const yieldPct = parseNum(draft.cooked_yield_pct);
  const yieldNote = yieldSummary({ base_state: draft.base_state, cooked_yield_pct: yieldPct });
  // null también cuando rinde exactamente 100: no gana ni pierde, y pintarlo
  // como pérdida sería mentir con el color.
  const gains = yieldPct === null || yieldPct === 100 ? null : yieldPct > 100;

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

      <Text style={s.section}>Crudo o cocido</Text>
      <Text style={s.sectionHint}>
        En qué forma se pesa este alimento, que es la forma a la que corresponden las
        macros de abajo. Un mismo arroz da 360 kcal/100 g seco y 130 cocido: la forma es
        parte del dato.
      </Text>
      <View style={s.chips}>
        {BASE_STATES.map(({ state, label }) => {
          const on = draft.base_state === state;
          return (
            <TouchableOpacity
              key={label}
              style={[s.chip, on && s.chipOn, !editable && !on && s.chipOff]}
              disabled={!editable}
              onPress={() => onChange('base_state')(state)}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {draft.base_state && (
        <View style={s.unitFields}>
          <Text style={s.sectionHint}>
            Cuánto pesa después de cocinarse. Con este dato el diario acepta el peso que
            tocó la balanza, esté crudo o cocido, y hace la conversión solo.
          </Text>
          <Field
            label="100 g crudos rinden"
            value={draft.cooked_yield_pct}
            onChange={onChange('cooked_yield_pct')}
            numeric
            suffix="g cocidos"
            placeholder="250"
            editable={editable}
          />
          {yieldNote ? (
            <Text
              style={[
                s.yieldNote,
                gains === false && s.yieldNoteLoss,
                gains === null && s.yieldNoteFlat,
              ]}>
              {yieldNote}
            </Text>
          ) : (
            <Text style={s.sectionHint}>
              El arroz ronda los 250 g (absorbe agua) y la pechuga los 75 (la suelta). Sin
              este número el diario solo acepta el peso en {stateLabel(draft.base_state)}.
            </Text>
          )}
        </View>
      )}

      <Text style={s.section}>
        Por 100 g{draft.base_state ? ` en ${stateLabel(draft.base_state)}` : ''}
      </Text>
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
    yieldNote: {
      color: c.success, fontSize: 12, lineHeight: 17, marginTop: -4, marginBottom: 12,
    },
    // Perder peso no es un error, pero es la mitad del dato que se olvida: se
    // distingue del que gana para no leer los dos igual de rápido.
    yieldNoteLoss: { color: c.warning },
    yieldNoteFlat: { color: c.textSecondary },
  });

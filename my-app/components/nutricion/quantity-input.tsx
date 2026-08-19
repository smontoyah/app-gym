import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { IntakeUnit } from '@/types/database';
import {
  convertQuantity, formatAmount, quantityToGrams, supportsUnits, unitName, unitSuffix, unitWeight,
  type Quantity, type UnitSpec,
} from '@/lib/nutricion/unidades';

type Props = {
  /** Producto elegido, o null para lo que solo se puede pesar (una receta). */
  spec: UnitSpec | null;
  quantity: Quantity;
  onChange: (q: Quantity) => void;
  autoFocus?: boolean;
};

/**
 * Campo de cantidad del diario y de las recetas.
 *
 * Se abre en la unidad que el producto tenga definida en su maestra —los huevos
 * en unidades, el arroz en gramos— y deja cambiar de unidad sin perder lo
 * escrito: 2 huevos pasan a 100 g, no a 2 g. Lo que sale para la base son
 * siempre gramos (`quantityToGrams`).
 */
export function QuantityInput({ spec, quantity, onChange, autoFocus }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const countable = supportsUnits(spec);
  const grams = quantityToGrams(quantity, spec);
  const weight = unitWeight(spec);

  // La otra cara de lo escrito. Se muestra siempre que haya algo escrito
  // porque es la cuenta que el usuario ya no tiene que hacer.
  const equivalence =
    grams === null
      ? null
      : quantity.unit === 'unidad'
        ? `Son ${formatAmount(grams)} g`
        : weight
          ? `Son ${formatAmount(grams / weight)} ${unitName(spec, grams / weight)}`
          : null;

  const pick = (unit: IntakeUnit) => onChange(convertQuantity(quantity, unit, spec));

  const options: { unit: IntakeUnit; label: string }[] = [
    { unit: 'unidad', label: capitalize(unitName(spec, 2)) },
    { unit: 'g', label: 'Gramos' },
  ];

  return (
    <>
      {countable && (
        <View style={s.chips}>
          {options.map(({ unit, label }) => {
            const on = quantity.unit === unit;
            return (
              <TouchableOpacity
                key={unit}
                style={[s.chip, on && s.chipOn]}
                onPress={() => pick(unit)}>
                <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={quantity.value}
          onChangeText={(value) => onChange({ ...quantity, value })}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          autoFocus={autoFocus}
        />
        <Text style={s.suffix}>{unitSuffix(spec, quantity)}</Text>
      </View>

      {equivalence ? <Text style={s.equivalence}>{equivalence}</Text> : null}
    </>
  );
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    chip: {
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    chipOn: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextOn: { color: c.accentText },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    input: { flex: 1, color: c.text, fontSize: 20, fontWeight: '700', paddingVertical: 12 },
    suffix: { color: c.textMuted, fontSize: 14, marginLeft: 8 },
    equivalence: { color: c.textSecondary, fontSize: 13, marginTop: 8 },
  });

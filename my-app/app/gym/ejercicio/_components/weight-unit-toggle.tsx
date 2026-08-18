import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { WEIGHT_UNITS, type WeightUnit } from '@/lib/units';
import type { AppColorScheme } from '@/constants/theme';

type WeightUnitToggleProps = {
  unit: WeightUnit;
  onChange: (unit: WeightUnit) => void;
};

/**
 * Cabecera de la columna de peso: elige la unidad de **captura**, un toque por
 * unidad y sin diálogos. Está aquí y no en Ajustes porque la graduación es de
 * la máquina, no del usuario: cada ejercicio recuerda la suya.
 */
export const WeightUnitToggle = memo(function WeightUnitToggle({
  unit,
  onChange,
}: WeightUnitToggleProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.root}>
      {WEIGHT_UNITS.map((option) => {
        const active = option === unit;
        return (
          <TouchableOpacity
            key={option}
            style={[s.chip, active && s.chipActive]}
            hitSlop={{ top: 10, bottom: 10, left: 3, right: 3 }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Registrar el peso en ${option}`}
            onPress={() => onChange(option)}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 3 },
    chip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    chipActive: { backgroundColor: c.accentBg },
    chipText: { color: c.textMuted, fontSize: 11 },
    chipTextActive: { color: c.accent, fontWeight: '800' },
  });

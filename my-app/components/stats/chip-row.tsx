import { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

export type ChipOption<T extends string> = { key: T; label: string };

type ChipRowProps<T extends string> = {
  options: readonly ChipOption<T>[];
  selected: T;
  onSelect: (key: T) => void;
  /** `sm` para los selectores secundarios (métrica, orden, grupo muscular). */
  size?: 'md' | 'sm';
};

/**
 * Fila de chips desplazable. Es el único selector de la pantalla: rango,
 * métrica, grupo muscular y orden se eligen todos igual, así que se ven igual.
 */
export function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  size = 'md',
}: ChipRowProps<T>) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const small = size === 'sm';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.row}
      contentContainerStyle={s.content}
    >
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <TouchableOpacity
            key={option.key}
            style={[small ? s.chipSm : s.chip, active && s.chipActive]}
            onPress={() => onSelect(option.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[small ? s.textSm : s.text, active && s.textActive]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexGrow: 0 },
    content: { flexDirection: 'row', gap: 8, paddingRight: 4 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: c.surfaceSecondary,
    },
    chipSm: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: c.surfaceSecondary,
    },
    chipActive: { backgroundColor: c.accent },
    text: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    textSm: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    textActive: { color: c.accentText },
  });

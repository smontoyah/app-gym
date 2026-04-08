import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type DaySelectorProps = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
};

export function DaySelector({ selectedDay, onSelectDay }: DaySelectorProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.row}>
      {DAYS.map((day, i) => (
        <TouchableOpacity
          key={i}
          style={[s.chip, selectedDay === i && s.chipActive]}
          onPress={() => onSelectDay(i)}>
          <Text style={[s.text, selectedDay === i && s.textActive]}>
            {day.substring(0, 3)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export { DAYS };

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { marginBottom: 20, flexGrow: 0 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: c.surface, marginRight: 8 },
    chipActive: { backgroundColor: c.accent },
    text: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    textActive: { color: c.accentText },
  });

import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type DaySelectorProps = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
};

export function DaySelector({ selectedDay, onSelectDay }: DaySelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {DAYS.map((day, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.chip, selectedDay === i && styles.chipActive]}
          onPress={() => onSelectDay(i)}>
          <Text style={[styles.text, selectedDay === i && styles.textActive]}>
            {day.substring(0, 3)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export { DAYS };

const styles = StyleSheet.create({
  row: { marginBottom: 20, flexGrow: 0 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#0a7ea4' },
  text: { color: '#888', fontSize: 14, fontWeight: '600' },
  textActive: { color: '#fff' },
});

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, type ThemeMode } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

const OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: 'Sistema', icon: '📱' },
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'dark', label: 'Oscuro', icon: '🌙' },
];

export function ThemeSelector() {
  const { mode, setMode, colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Apariencia</Text>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, mode === opt.value && styles.optionActive]}
            onPress={() => setMode(opt.value)}>
            <Text style={styles.icon}>{opt.icon}</Text>
            <Text
              style={[styles.label, mode === opt.value && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
    },
    title: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    options: { flexDirection: 'row', gap: 8 },
    option: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionActive: {
      borderColor: c.accent,
      backgroundColor: c.background,
    },
    icon: { fontSize: 22, marginBottom: 6 },
    label: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
    labelActive: { color: c.accent, fontWeight: '700' },
  });

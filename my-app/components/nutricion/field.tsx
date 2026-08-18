import { useMemo } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** El modelo declaró este campo ilegible: se resalta para que lo revisen. */
  flagged?: boolean;
  numeric?: boolean;
  placeholder?: string;
  suffix?: string;
};

export function Field({ label, value, onChange, flagged, numeric, placeholder, suffix }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {flagged && <Text style={s.flag}>revisar</Text>}
      </View>
      <View style={[s.inputWrap, flagged && s.inputFlagged]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    wrap: { marginBottom: 12 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
    label: { color: c.textSecondary, fontSize: 13 },
    flag: {
      color: c.warning,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      backgroundColor: c.warningBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    inputFlagged: { borderColor: c.warning, backgroundColor: c.warningBg },
    input: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 10 },
    suffix: { color: c.textMuted, fontSize: 13, marginLeft: 6 },
  });

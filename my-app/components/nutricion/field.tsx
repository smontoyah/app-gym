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
  /** false para los productos que cargó otro usuario: se ven, no se tocan. */
  editable?: boolean;
};

export function Field({
  label, value, onChange, flagged, numeric, placeholder, suffix, editable = true,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {flagged && <Text style={s.flag}>revisar</Text>}
      </View>
      <View style={[s.inputWrap, flagged && s.inputFlagged, !editable && s.inputReadOnly]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          editable={editable}
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
    // Sin borde y con el fondo hundido: se lee como dato, no como campo vacío.
    inputReadOnly: { backgroundColor: c.surfaceSecondary, borderColor: 'transparent' },
    input: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 10 },
    suffix: { color: c.textMuted, fontSize: 13, marginLeft: 6 },
  });

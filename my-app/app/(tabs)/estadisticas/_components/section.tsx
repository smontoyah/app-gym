import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

type SectionProps = {
  title: string;
  /** Texto a la derecha del título: el dato que resume la sección. */
  hint?: string;
  children: ReactNode;
};

/** Bloque con título del resumen. Todas las secciones se ven igual. */
export function Section({ title, hint, children }: SectionProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        {!!hint && <Text style={s.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 12 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    title: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    hint: { color: c.textMuted, fontSize: 11, flexShrink: 1, textAlign: 'right' },
  });

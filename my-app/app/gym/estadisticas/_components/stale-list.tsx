import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from '@/components/stats/section';
import { STALE_DAYS, type StaleEntry } from '../_lib/analysis';
import type { AppColorScheme } from '@/constants/theme';

type StaleListProps = {
  entries: StaleEntry[];
};

/**
 * Lo que la lista de ejercicios no puede mostrar: si el rango es «7 días», un
 * ejercicio que no se tocó esa semana simplemente no aparece. Acá sí.
 */
export const StaleList = memo(function StaleList({ entries }: StaleListProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (entries.length === 0) return null;

  return (
    <Section title="Sin registrar" hint={`${STALE_DAYS} días o más`}>
      {entries.map((entry) => (
        <View key={entry.exerciseId} style={s.row}>
          <View style={s.body}>
            <Text style={s.name} numberOfLines={1}>
              {entry.name}
            </Text>
            <Text style={s.meta}>{entry.muscleGroup}</Text>
          </View>
          <Text style={[s.days, entry.days === null && s.never]}>
            {entry.days === null ? 'nunca' : `hace ${entry.days} d`}
          </Text>
        </View>
      ))}
      <Text style={s.legend}>Está en la rutina pero no aparece en el historial reciente.</Text>
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
    body: { flex: 1 },
    name: { color: c.text, fontSize: 13, fontWeight: '600' },
    meta: { color: c.textMuted, fontSize: 11, marginTop: 1 },
    days: { color: c.warning, fontSize: 12, fontWeight: '700' },
    never: { color: c.textMuted },
    legend: { color: c.textMuted, fontSize: 10, lineHeight: 14 },
  });

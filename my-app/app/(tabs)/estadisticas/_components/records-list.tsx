import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { formatShort } from '@/lib/date';
import { Section } from './section';
import { formatKg, plural } from '../_lib/format';
import type { RecordStat } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/** Más de esto y deja de ser una lista de logros para volverse un listado. */
const MAX_VISIBLE = 5;

type RecordsListProps = {
  records: RecordStat[];
};

export const RecordsList = memo(function RecordsList({ records }: RecordsListProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (records.length === 0) return null;

  const visible = records.slice(0, MAX_VISIBLE);
  const hidden = records.length - visible.length;

  return (
    <Section title="Récords del período" hint={plural(records.length, 'récord', 'récords')}>
      {visible.map((record) => (
        <View key={`${record.exerciseId}-${record.date}`} style={s.row}>
          <Text style={s.medal}>🏅</Text>
          <View style={s.body}>
            <Text style={s.name} numberOfLines={1}>
              {record.name}
            </Text>
            <Text style={s.meta}>
              {record.muscleGroup} · {formatShort(record.date)}
            </Text>
          </View>
          <View style={s.values}>
            <Text style={s.value}>{formatKg(record.e1rm)} kg</Text>
            <Text style={s.gain}>desde {formatKg(record.prevBest)}</Text>
          </View>
        </View>
      ))}

      {hidden > 0 && <Text style={s.more}>y {hidden} más en este período</Text>}
      <Text style={s.legend}>1RM estimado que superó a todas las sesiones anteriores.</Text>
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    medal: { fontSize: 16 },
    body: { flex: 1 },
    name: { color: c.text, fontSize: 13, fontWeight: '600' },
    meta: { color: c.textMuted, fontSize: 11, marginTop: 1 },
    values: { alignItems: 'flex-end' },
    value: { color: c.success, fontSize: 14, fontWeight: '800' },
    gain: { color: c.textMuted, fontSize: 10, marginTop: 1 },
    more: { color: c.textSecondary, fontSize: 11, marginBottom: 6 },
    legend: { color: c.textMuted, fontSize: 10, lineHeight: 14 },
  });

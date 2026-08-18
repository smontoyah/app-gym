import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/date';
import { Section } from './section';
import {
  absDelta,
  countDelta,
  formatRpe,
  formatVolume,
  pctDelta,
  plural,
  type Delta,
} from '../_lib/format';
import type { TrainingSummary } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type Tile = {
  label: string;
  value: string;
  delta: Delta | null;
  /** El RPE no mejora al subir ni al bajar: su variación se pinta neutra. */
  neutral?: boolean;
};

type SummaryPanelProps = {
  summary: TrainingSummary;
  periodTitle: string;
  /** Con «Todo» no hay período anterior contra el que comparar. */
  showComparison: boolean;
};

export const SummaryPanel = memo(function SummaryPanel({
  summary,
  periodTitle,
  showComparison,
}: SummaryPanelProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const tiles = useMemo<Tile[]>(() => {
    const { prev } = summary;
    return [
      {
        label: 'Sesiones',
        value: String(summary.sessions),
        delta: showComparison ? countDelta(summary.sessions, prev.sessions) : null,
      },
      {
        label: 'Series',
        value: String(summary.sets),
        delta: showComparison ? countDelta(summary.sets, prev.sets) : null,
      },
      {
        label: 'Volumen',
        value: formatVolume(summary.volume),
        delta: showComparison ? pctDelta(summary.volume, prev.volume) : null,
      },
      {
        label: 'RPE promedio',
        value: formatRpe(summary.avgRpe),
        delta: showComparison ? absDelta(summary.avgRpe, prev.avgRpe) : null,
        neutral: true,
      },
    ];
  }, [summary, showComparison]);

  const facts = useMemo(() => {
    const list: string[] = [];
    if (summary.avgDurationMin !== null) {
      list.push(`${formatDuration(summary.avgDurationMin)} por sesión`);
    }
    if (summary.exercises > 0) {
      list.push(plural(summary.exercises, 'ejercicio', 'ejercicios'));
    }
    if (summary.records.length > 0) {
      list.push(plural(summary.records.length, 'récord', 'récords'));
    }
    if (summary.cardioSessions > 0) {
      list.push(`${summary.cardioMinutes} min de cardio`);
    }
    return list;
  }, [summary]);

  const deltaColor = (delta: Delta, neutral?: boolean) => {
    if (neutral || delta.direction === 'flat') return colors.textMuted;
    return delta.direction === 'up' ? colors.success : colors.danger;
  };

  return (
    <Section title="Resumen" hint={periodTitle}>
      <View style={s.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={s.tile}>
            <Text style={s.tileLabel}>{tile.label}</Text>
            <Text style={s.tileValue}>{tile.value}</Text>
            {tile.delta ? (
              <Text style={[s.tileDelta, { color: deltaColor(tile.delta, tile.neutral) }]}>
                {tile.delta.label}
              </Text>
            ) : (
              <Text style={s.tileDeltaEmpty}>—</Text>
            )}
          </View>
        ))}
      </View>

      {facts.length > 0 && <Text style={s.facts}>{facts.join(' · ')}</Text>}

      {showComparison && (
        <Text style={s.footnote}>La variación compara con el período anterior de igual duración.</Text>
      )}
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: c.surfaceSecondary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    tileLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    tileValue: { color: c.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
    tileDelta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    tileDeltaEmpty: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    facts: { color: c.textSecondary, fontSize: 12, marginTop: 12, lineHeight: 17 },
    footnote: { color: c.textMuted, fontSize: 10, marginTop: 6, lineHeight: 14 },
  });

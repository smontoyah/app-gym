import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { formatShort } from '@/lib/date';
import { Sparkline } from './sparkline';
import {
  computeTrend,
  METRIC_LABEL,
  metricValue,
  progressMetric,
  type ProgressMetric,
} from '../_lib/analysis';
import { formatKg, formatRpe, formatVolume, plural } from '../_lib/format';
import type { ExerciseStat, SessionPoint } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type StatCardProps = {
  stat: ExerciseStat;
  /** Batió su récord dentro del período consultado. */
  hasRecord: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

/** Diferencia de una sesión contra la inmediatamente anterior. */
function sessionDelta(
  recent: SessionPoint[],
  index: number,
  metric: ProgressMetric
): { label: string; positive: boolean } | null {
  const previous = recent[index + 1];
  if (!previous) return null;

  const diff =
    Math.round((metricValue(recent[index], metric) - metricValue(previous, metric)) * 10) / 10;
  if (diff === 0) return null;

  return { label: `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)}`, positive: diff > 0 };
}

/** Series, volumen y 1RM de una sesión, omitiendo lo que no aplica sin carga. */
function sessionSub(session: SessionPoint): string {
  const parts = [plural(session.sets, 'serie', 'series')];
  if (session.volume > 0) parts.push(formatVolume(session.volume));
  if (session.e1rm > 0) parts.push(`1RM est. ${formatKg(session.e1rm)}`);
  return parts.join(' · ');
}

type Figure = { label: string; value: string; hint: string };

/**
 * Tres cifras con carga; dos sin ella. Un «récord de 0 kg» en los abdominales
 * es exactamente el tipo de dato que hace que la pantalla no sirva para nada.
 */
function buildFigures(stat: ExerciseStat, metric: ProgressMetric): Figure[] {
  if (metric === 'e1rm') {
    return [
      {
        label: 'Última',
        value: `${formatKg(stat.lastWeight)} kg × ${stat.lastReps}`,
        hint: formatShort(stat.lastDate),
      },
      {
        label: '1RM est.',
        value: `${formatKg(stat.lastE1rm)} kg`,
        hint: `vol. ${formatVolume(stat.volume)}`,
      },
      {
        label: 'Récord',
        value: `${formatKg(stat.bestE1rm)} kg`,
        hint: formatShort(stat.prDate),
      },
    ];
  }

  const ultima = {
    label: 'Última',
    value: `${stat.lastReps} reps`,
    hint: formatShort(stat.lastDate),
  };
  if (stat.recent.length === 0) return [ultima];

  // El máximo es el del período: sin carga el servidor no guarda un PR aparte.
  const best = stat.recent.reduce((top, point) => (point.reps > top.reps ? point : top));

  return [ultima, { label: 'Mejor', value: `${best.reps} reps`, hint: formatShort(best.date) }];
}

export const StatCard = memo(function StatCard({
  stat,
  hasRecord,
  isExpanded,
  onToggle,
}: StatCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const metric = progressMetric(stat);
  const trend = useMemo(() => computeTrend(stat), [stat]);

  // La mini-gráfica se lee de izquierda a derecha; `recent` llega al revés.
  const series = useMemo(
    () => stat.recent.map((point) => metricValue(point, metric)).reverse(),
    [stat.recent, metric]
  );

  const figures = useMemo(() => buildFigures(stat, metric), [stat, metric]);

  const meta = [
    stat.muscleGroup,
    plural(stat.sessions, 'sesión', 'sesiones'),
    plural(stat.sets, 'serie', 'series'),
    stat.avgRpe !== null ? `RPE ${formatRpe(stat.avgRpe)}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  const trendColor =
    trend === null
      ? colors.textMuted
      : trend.direction === 'up'
        ? colors.success
        : trend.direction === 'down'
          ? colors.danger
          : colors.textMuted;

  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.8}>
      <View style={s.header}>
        <View style={s.titleBox}>
          <Text style={s.name}>{stat.name}</Text>
          <Text style={s.meta}>{meta}</Text>
        </View>
        {hasRecord && (
          <View style={s.recordBadge}>
            <Text style={s.recordText}>🏅 récord</Text>
          </View>
        )}
      </View>

      <View style={s.middle}>
        <Sparkline values={series} />
        {trend ? (
          <View style={s.trend}>
            <Text style={[s.trendValue, { color: trendColor }]}>
              {trend.direction === 'flat' ? '=' : trend.direction === 'up' ? '↑' : '↓'}{' '}
              {Math.abs(trend.pct)} %
            </Text>
            <Text style={s.trendLabel}>{METRIC_LABEL[metric]}</Text>
          </View>
        ) : (
          <Text style={s.trendEmpty}>una sola sesión</Text>
        )}
      </View>

      <View style={s.figures}>
        {figures.map((figure) => (
          <View key={figure.label} style={s.figure}>
            <Text style={s.figureLabel}>{figure.label}</Text>
            <Text style={s.figureValue}>{figure.value}</Text>
            <Text style={s.figureHint}>{figure.hint}</Text>
          </View>
        ))}
      </View>

      <View style={s.expander}>
        <Text style={s.expanderText}>
          {isExpanded
            ? 'Ocultar sesiones'
            : `Ver ${plural(stat.recent.length, 'sesión', 'sesiones')}`}
        </Text>
        <Text style={s.chevron}>{isExpanded ? '▴' : '▾'}</Text>
      </View>

      {isExpanded && (
        <View style={s.history}>
          {stat.recent.map((session, index) => {
            const delta = sessionDelta(stat.recent, index, metric);
            return (
              <View key={session.date} style={s.historyRow}>
                <Text style={s.historyDate}>{formatShort(session.date)}</Text>
                <View style={s.historyBody}>
                  <Text style={s.historyMain}>
                    {formatKg(session.weight)} kg × {session.reps}
                    {session.rpe !== null ? `  ·  RPE ${formatRpe(session.rpe)}` : ''}
                  </Text>
                  <Text style={s.historySub}>{sessionSub(session)}</Text>
                </View>
                <View style={s.historyRight}>
                  {session.date === stat.prDate && <Text style={s.historyMedal}>🏅</Text>}
                  {delta && (
                    <Text
                      style={[
                        s.historyDelta,
                        { color: delta.positive ? colors.success : colors.danger },
                      ]}
                    >
                      {delta.label}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
          <Text style={s.historyLegend}>
            La variación es contra la sesión anterior, medida en {METRIC_LABEL[metric]}.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    titleBox: { flex: 1 },
    name: { color: c.text, fontSize: 15, fontWeight: '700' },
    meta: { color: c.textMuted, fontSize: 11, marginTop: 3 },
    recordBadge: {
      backgroundColor: c.successBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    recordText: { color: c.success, fontSize: 10, fontWeight: '800' },
    middle: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 12,
    },
    trend: { alignItems: 'flex-end' },
    trendValue: { fontSize: 15, fontWeight: '800' },
    trendLabel: { color: c.textMuted, fontSize: 10, marginTop: 1 },
    trendEmpty: { color: c.textMuted, fontSize: 11 },
    figures: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.surfaceSecondary,
      paddingTop: 10,
    },
    figure: { flex: 1 },
    figureLabel: { color: c.textMuted, fontSize: 10, fontWeight: '600' },
    figureValue: { color: c.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
    figureHint: { color: c.textMuted, fontSize: 10, marginTop: 1 },
    expander: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 10,
    },
    expanderText: { color: c.accent, fontSize: 12, fontWeight: '600' },
    chevron: { color: c.accent, fontSize: 11 },
    history: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.surfaceSecondary,
      paddingTop: 10,
    },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
    historyDate: { color: c.textSecondary, fontSize: 12, width: 46 },
    historyBody: { flex: 1 },
    historyMain: { color: c.text, fontSize: 13, fontWeight: '500' },
    historySub: { color: c.textMuted, fontSize: 10, marginTop: 1 },
    historyRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyMedal: { fontSize: 11 },
    historyDelta: { fontSize: 12, fontWeight: '700' },
    historyLegend: { color: c.textMuted, fontSize: 10, marginTop: 8, lineHeight: 14 },
  });

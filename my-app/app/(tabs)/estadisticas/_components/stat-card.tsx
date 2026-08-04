import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { formatShort } from '@/lib/date';
import type { ExerciseStat, RecentSession } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * La tendencia se mide sobre el 1RM estimado, no sobre el peso crudo.
 * En un plan a 13 repeticiones, 40 kg × 13 es mejor sesión que 45 kg × 8,
 * y mirando sólo el peso máximo la segunda parecería un progreso.
 */
function computeTrend(
  recent: RecentSession[]
): { label: string; colorKey: 'success' | 'danger' | 'textMuted' } | null {
  if (recent.length < 2) return null;

  const last = recent[0].e1rm;
  const baseline = recent.slice(1, 4);
  const avg = baseline.reduce((sum, r) => sum + r.e1rm, 0) / baseline.length;
  const delta = Math.round((last - avg) * 10) / 10;

  if (delta > 0) return { label: `↑ +${delta}`, colorKey: 'success' };
  if (delta < 0) return { label: `↓ ${delta}`, colorKey: 'danger' };
  return { label: '= igual', colorKey: 'textMuted' };
}

type StatCardProps = {
  stat: ExerciseStat;
  isExpanded: boolean;
  onToggle: () => void;
};

export const StatCard = memo(function StatCard({ stat, isExpanded, onToggle }: StatCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const trend = useMemo(() => computeTrend(stat.recent), [stat.recent]);

  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.7}>
      <View style={s.header}>
        <View style={s.titleBox}>
          <Text style={s.name}>{stat.name}</Text>
          <Text style={s.muscle}>{stat.muscleGroup}</Text>
        </View>
        <View style={s.badges}>
          <View style={s.badge}>
            <Text style={s.badgeValue}>{stat.maxWeight}</Text>
            <Text style={s.badgeLabel}>Máx kg</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeValue}>{stat.bestE1rm}</Text>
            <Text style={s.badgeLabel}>1RM est.</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeValue}>{stat.totalSessions}</Text>
            <Text style={s.badgeLabel}>Sesiones</Text>
          </View>
          {trend && (
            <View style={s.badge}>
              <Text style={[s.trendValue, { color: colors[trend.colorKey] }]}>{trend.label}</Text>
              <Text style={s.badgeLabel}>Tendencia</Text>
            </View>
          )}
        </View>
      </View>

      {isExpanded && (
        <View style={s.history}>
          <Text style={s.historyTitle}>Últimas sesiones</Text>
          {stat.recent.map((session) => (
            <View key={session.date} style={s.historyRow}>
              <Text style={s.historyDate}>{formatShort(session.date)}</Text>
              <Text style={s.historyDetail}>
                {session.weight} kg × {session.reps}
                {session.rpe !== null ? ` @ RPE ${session.rpe}` : ''}
              </Text>
              <Text style={s.historyMeta}>
                {session.sets} series · {Math.round(session.volume)} kg vol
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    titleBox: { flex: 1 },
    name: { color: c.text, fontSize: 16, fontWeight: '700' },
    muscle: { color: c.accent, fontSize: 12, marginTop: 2 },
    badges: { flexDirection: 'row', gap: 10 },
    badge: { alignItems: 'center', minWidth: 40 },
    badgeValue: { color: c.text, fontSize: 16, fontWeight: '800' },
    trendValue: { fontSize: 13, fontWeight: '800' },
    badgeLabel: { color: c.textMuted, fontSize: 10, marginTop: 2 },
    history: { marginTop: 16, borderTopWidth: 1, borderTopColor: c.surfaceSecondary, paddingTop: 12 },
    historyTitle: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      gap: 8,
    },
    historyDate: { color: c.textSecondary, fontSize: 13, width: 52 },
    historyDetail: { flex: 1, color: c.text, fontSize: 14, fontWeight: '500' },
    historyMeta: { color: c.textMuted, fontSize: 11 },
  });

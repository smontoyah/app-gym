import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseStat, RecentLog } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

const MONTH_ABBR = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  if (isNaN(day) || monthIndex < 0 || monthIndex > 11) return dateStr;
  return `${day} ${MONTH_ABBR[monthIndex]}`;
}

function computeTrend(recentLogs: RecentLog[]): { label: string; colorKey: 'success' | 'danger' | 'textMuted' } | null {
  if (recentLogs.length < 2) return null;
  const lastWeight = recentLogs[0].weight;
  const previousLogs = recentLogs.slice(1, 4);
  const avgPrevious = previousLogs.reduce((sum, l) => sum + l.weight, 0) / previousLogs.length;
  const delta = Math.round((lastWeight - avgPrevious) * 10) / 10;
  if (delta > 0) return { label: `↑ +${delta}kg`, colorKey: 'success' };
  if (delta < 0) return { label: `↓ ${delta}kg`, colorKey: 'danger' };
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
  const trend = useMemo(() => computeTrend(stat.recentLogs), [stat.recentLogs]);

  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.7}>
      <View style={s.header}>
        <View>
          <Text style={s.name}>{stat.exercise.name}</Text>
          <Text style={s.muscle}>{stat.exercise.muscle_group}</Text>
        </View>
        <View style={s.badges}>
          <View style={s.badge}>
            <Text style={s.badgeValue}>{stat.maxWeight}</Text>
            <Text style={s.badgeLabel}>Máx kg</Text>
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
          {stat.recentLogs.map((log) => (
            <View key={log.date} style={s.historyRow}>
              <Text style={s.historyDate}>{formatDate(log.date)}</Text>
              <Text style={s.historyDetail}>{log.weight} kg × {log.reps} reps</Text>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { color: c.text, fontSize: 17, fontWeight: '700' },
    muscle: { color: c.accent, fontSize: 13, marginTop: 2 },
    badges: { flexDirection: 'row', gap: 12 },
    badge: { alignItems: 'center' },
    badgeValue: { color: c.text, fontSize: 18, fontWeight: '800' },
    trendValue: { fontSize: 14, fontWeight: '800' },
    badgeLabel: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    history: { marginTop: 16, borderTopWidth: 1, borderTopColor: c.surfaceSecondary, paddingTop: 12 },
    historyTitle: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    historyDate: { color: c.textSecondary, fontSize: 14 },
    historyDetail: { color: c.text, fontSize: 14, fontWeight: '500' },
  });

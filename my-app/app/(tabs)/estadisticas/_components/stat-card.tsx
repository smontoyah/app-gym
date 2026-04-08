import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseStat } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type StatCardProps = {
  stat: ExerciseStat;
  isExpanded: boolean;
  onToggle: () => void;
};

export function StatCard({ stat, isExpanded, onToggle }: StatCardProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);

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
        </View>
      </View>
      {isExpanded && (
        <View style={s.history}>
          <Text style={s.historyTitle}>Últimas sesiones</Text>
          {stat.recentLogs.map((log) => (
            <View key={log.date} style={s.historyRow}>
              <Text style={s.historyDate}>{log.date}</Text>
              <Text style={s.historyDetail}>{log.weight} kg × {log.reps} reps</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { color: c.text, fontSize: 17, fontWeight: '700' },
    muscle: { color: c.accent, fontSize: 13, marginTop: 2 },
    badges: { flexDirection: 'row', gap: 12 },
    badge: { alignItems: 'center' },
    badgeValue: { color: c.text, fontSize: 18, fontWeight: '800' },
    badgeLabel: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    history: { marginTop: 16, borderTopWidth: 1, borderTopColor: c.surfaceSecondary, paddingTop: 12 },
    historyTitle: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    historyDate: { color: c.textSecondary, fontSize: 14 },
    historyDetail: { color: c.text, fontSize: 14, fontWeight: '500' },
  });

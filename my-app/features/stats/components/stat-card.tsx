import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ExerciseStat } from '../types';

type StatCardProps = {
  stat: ExerciseStat;
  isExpanded: boolean;
  onToggle: () => void;
};

export function StatCard({ stat, isExpanded, onToggle }: StatCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{stat.exercise.name}</Text>
          <Text style={styles.muscle}>{stat.exercise.muscle_group}</Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeValue}>{stat.maxWeight}</Text>
            <Text style={styles.badgeLabel}>Máx kg</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeValue}>{stat.totalSessions}</Text>
            <Text style={styles.badgeLabel}>Sesiones</Text>
          </View>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>Últimas sesiones</Text>
          {stat.recentLogs.map((log) => (
            <View key={log.date} style={styles.historyRow}>
              <Text style={styles.historyDate}>{log.date}</Text>
              <Text style={styles.historyDetail}>
                {log.weight} kg × {log.reps} reps
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  muscle: { color: '#0a7ea4', fontSize: 13, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 12 },
  badge: { alignItems: 'center' },
  badgeValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  badgeLabel: { color: '#666', fontSize: 11, marginTop: 2 },
  history: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 12,
  },
  historyTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  historyDate: { color: '#aaa', fontSize: 14 },
  historyDetail: { color: '#fff', fontSize: 14, fontWeight: '500' },
});

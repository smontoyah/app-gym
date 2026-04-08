import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchExerciseStats } from '@/features/stats/actions';
import { StatCard } from '@/features/stats/components/stat-card';
import type { ExerciseStat } from '@/features/stats/types';

export default function StatsScreen() {
  const [stats, setStats] = useState<ExerciseStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const { data } = await fetchExerciseStats();
        setStats(data);
        setLoading(false);
      })();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (stats.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>No hay datos todavía</Text>
        <Text style={styles.emptySubtext}>
          Registrá tu primer entrenamiento para ver estadísticas
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {stats.map((stat) => (
        <StatCard
          key={stat.exercise.id}
          stat={stat}
          isExpanded={expandedId === stat.exercise.id}
          onToggle={() =>
            setExpandedId(expandedId === stat.exercise.id ? null : stat.exercise.id)
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#888', fontSize: 14, marginTop: 8 },
});

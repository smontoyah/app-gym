import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { fetchExerciseStats } from './_lib/actions';
import { StatCard } from './_components/stat-card';
import type { ExerciseStat } from './_lib/types';
import type { AppColorScheme } from '@/constants/theme';

export default function StatsScreen() {
  const { colors } = useTheme();
  const s = createStyles(colors);
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
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (stats.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>📊</Text>
        <Text style={s.emptyText}>No hay datos todavía</Text>
        <Text style={s.emptySubtext}>Registrá tu primer entrenamiento para ver estadísticas</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {stats.map((stat) => (
        <StatCard
          key={stat.exercise.id}
          stat={stat}
          isExpanded={expandedId === stat.exercise.id}
          onToggle={() => setExpandedId(expandedId === stat.exercise.id ? null : stat.exercise.id)}
        />
      ))}
    </ScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: c.text, fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: c.textSecondary, fontSize: 14, marginTop: 8 },
  });

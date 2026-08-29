import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { fetchStats } from './_lib/actions';
import { buildRange, hasComparison, RANGE_KEYS, type RangeKey } from '@/lib/date-ranges';
import {
  filterStats,
  muscleGroups,
  sortStats,
  staleEntries,
  type SortKey,
} from './_lib/analysis';
import { EMPTY_SUMMARY, type ExerciseStat, type TrainingSummary } from './_lib/types';
import { ChipRow, type ChipOption } from '@/components/stats/chip-row';
import { SummaryPanel } from './_components/summary-panel';
import { DayChart } from './_components/day-chart';
import { RecordsList } from './_components/records-list';
import { MuscleBalance } from './_components/muscle-balance';
import { StaleList } from './_components/stale-list';
import { FilterBar } from './_components/filter-bar';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useToday } from '@/hooks/use-today';
import { StatCard } from './_components/stat-card';
import type { AppColorScheme } from '@/constants/theme';

/**
 * Un mes es el rango por defecto: con este plan una semana puede traer dos
 * sesiones y cualquier comparación sobre eso es anécdota, no tendencia.
 */
const DEFAULT_RANGE: RangeKey = '30d';

const RANGE_OPTIONS: readonly ChipOption<RangeKey>[] = RANGE_KEYS.map((key) => ({
  key,
  label: buildRange(key).label,
}));

export default function StatsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  // Al buscar un ejercicio, los resultados tienen que quedar alcanzables.
  const keyboardHeight = useKeyboardHeight();

  const [rangeKey, setRangeKey] = useState<RangeKey>(DEFAULT_RANGE);
  const [summary, setSummary] = useState<TrainingSummary>(EMPTY_SUMMARY);
  const [stats, setStats] = useState<ExerciseStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = useToday();
  const range = useMemo(() => buildRange(rangeKey, today), [rangeKey, today]);

  const load = useCallback(async () => {
    const payload = await fetchStats(range);
    setSummary(payload.summary);
    setStats(payload.stats);
    setError(payload.error);
  }, [range]);

  // Cambiar de rango cambia `load`, así que el efecto vuelve a correr solo.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const muscles = useMemo(() => muscleGroups(stats), [stats]);

  // Al cambiar de rango el grupo elegido puede no existir en el nuevo período;
  // se ignora en vez de dejar la lista vacía sin explicación.
  const activeMuscle = muscle && muscles.includes(muscle) ? muscle : null;

  const visible = useMemo(
    () => sortStats(filterStats(stats, { query, muscle: activeMuscle }), sort),
    [stats, query, activeMuscle, sort]
  );

  const recordIds = useMemo(
    () => new Set(summary.records.map((record) => record.exerciseId)),
    [summary.records]
  );

  const stale = useMemo(() => staleEntries(summary.stale), [summary.stale]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const hasData = summary.sessions > 0 || stats.length > 0;

  const header = (
    <View>
      {error !== null && (
        <TouchableOpacity style={s.errorBox} onPress={refresh} activeOpacity={0.8}>
          <Text style={s.errorText}>{error}</Text>
          <Text style={s.errorHint}>Tocá para reintentar</Text>
        </TouchableOpacity>
      )}

      {hasData ? (
        <>
          <SummaryPanel
            summary={summary}
            periodTitle={range.title}
            showComparison={hasComparison(rangeKey)}
          />
          <DayChart days={summary.byDay} />
          <RecordsList records={summary.records} />
          <MuscleBalance muscles={summary.byMuscle} />
          <StaleList entries={stale} />
          <FilterBar
            query={query}
            onQueryChange={setQuery}
            muscles={muscles}
            muscle={activeMuscle}
            onMuscleChange={setMuscle}
            sort={sort}
            onSortChange={setSort}
            shown={visible.length}
            total={stats.length}
          />
        </>
      ) : (
        error === null && (
          <View>
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📊</Text>
              {rangeKey === 'all' ? (
                <>
                  <Text style={s.emptyTitle}>Todavía no hay datos</Text>
                  <Text style={s.emptyText}>
                    Registrá tu primer entrenamiento y acá vas a ver el progreso de cada ejercicio.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.emptyTitle}>Sin registros en este período</Text>
                  <Text style={s.emptyText}>
                    No hay nada entre {range.from} y {range.to}. Probá con un rango más amplio.
                  </Text>
                </>
              )}
            </View>
            <StaleList entries={stale} />
          </View>
        )
      )}
    </View>
  );

  return (
    <View style={s.screen}>
      <View style={s.toolbar}>
        <ChipRow options={RANGE_OPTIONS} selected={rangeKey} onSelect={setRangeKey} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          style={s.list}
          contentContainerStyle={[s.content, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
          data={visible}
          keyExtractor={(item) => item.exerciseId}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            hasData ? (
              <View style={s.noMatch}>
                <Text style={s.noMatchText}>Ningún ejercicio coincide con el filtro.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <StatCard
              stat={item}
              hasRecord={recordIds.has(item.exerciseId)}
              isExpanded={expandedId === item.exerciseId}
              onToggle={() => handleToggle(item.exerciseId)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    toolbar: {
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    list: { flex: 1 },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorBox: {
      backgroundColor: c.warningBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    errorText: { color: c.warning, fontSize: 13, fontWeight: '600' },
    errorHint: { color: c.textMuted, fontSize: 11, marginTop: 4 },
    empty: { alignItems: 'center', paddingTop: 40 },
    emptyIcon: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700' },
    emptyText: {
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 8,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: 12,
    },
    noMatch: { paddingVertical: 24, alignItems: 'center' },
    noMatchText: { color: c.textMuted, fontSize: 13 },
  });

import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { ChipRow, type ChipOption } from '@/components/stats/chip-row';
import { Section } from '@/components/stats/section';
import { WeightChart } from '@/components/nutricion/weight-chart';
import { formatKg, type DayPoint } from '@/lib/nutricion/peso';
import { buildRange, hasComparison, RANGE_KEYS, type RangeKey } from '@/lib/date-ranges';
import { plural } from '@/lib/stats-format';
import type { NutritionGoals } from '@/types/database';
import { chartSeries, fetchNutritionStats } from './_lib/actions';
import { EMPTY_SUMMARY, type NutritionSummary } from './_lib/types';
import { SummaryPanel } from './_components/summary-panel';
import { KcalChart } from './_components/kcal-chart';
import { GoalMeters } from './_components/goal-meters';
import { MealSplit } from './_components/meal-split';
import { TopFoods } from './_components/top-foods';
import type { AppColorScheme } from '@/constants/theme';

/**
 * Un mes por defecto, igual que en Gym: con siete días, dos comidas sin anotar
 * mueven el promedio lo suficiente como para que la comparación sea anécdota.
 */
const DEFAULT_RANGE: RangeKey = '30d';

const RANGE_OPTIONS: readonly ChipOption<RangeKey>[] = RANGE_KEYS.map((key) => ({
  key,
  label: buildRange(key).label,
}));

export default function NutricionStatsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [rangeKey, setRangeKey] = useState<RangeKey>(DEFAULT_RANGE);
  const [summary, setSummary] = useState<NutritionSummary>(EMPTY_SUMMARY);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [weights, setWeights] = useState<DayPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = useToday();
  const range = useMemo(() => buildRange(rangeKey, today), [rangeKey, today]);

  const load = useCallback(async () => {
    const payload = await fetchNutritionStats(range);
    setSummary(payload.summary);
    setGoals(payload.goals);
    setWeights(payload.weights);
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

  const days = useMemo(() => chartSeries(summary), [summary]);

  const hasData = summary.daysLogged > 0;

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
        <ScrollView
          style={s.list}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
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
                goals={goals}
                weights={weights}
                periodTitle={range.title}
                showComparison={hasComparison(rangeKey)}
              />

              <KcalChart days={days} goals={goals} avgKcal={summary.avg.kcal} />
              <GoalMeters
                avg={summary.avg}
                goals={goals}
                daysComplete={summary.daysComplete}
              />

              {weights.length >= 2 && (
                <Section
                  title="Peso corporal"
                  hint={`${formatKg(weights[0].kg)} → ${formatKg(weights[weights.length - 1].kg)} kg`}
                >
                  <WeightChart points={weights} />
                  <Text style={s.weightNote}>
                    {plural(weights.length, 'medición', 'mediciones')} en el período. El eje no arranca
                    en cero: con el cero abajo, un kilo de diferencia se vería plano.
                  </Text>
                </Section>
              )}

              <MealSplit meals={summary.byMeal} daysLogged={summary.daysLogged} />
              <TopFoods foods={summary.topFoods} />
            </>
          ) : (
            error === null && (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🥗</Text>
                {rangeKey === 'all' ? (
                  <>
                    <Text style={s.emptyTitle}>Todavía no hay registros</Text>
                    <Text style={s.emptyText}>
                      Anotá lo que comés en el Diario y acá vas a ver el promedio del período, cómo
                      te va contra tus metas y qué conviene revisar.
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
            )
          )}
        </ScrollView>
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
    errorBox: { backgroundColor: c.warningBg, borderRadius: 12, padding: 14, marginBottom: 12 },
    errorText: { color: c.warning, fontSize: 13, fontWeight: '600' },
    errorHint: { color: c.textMuted, fontSize: 11, marginTop: 4 },
    empty: { alignItems: 'center', paddingTop: 40 },
    emptyIcon: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700' },
    emptyText: {
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: 12,
    },
    weightNote: { color: c.textMuted, fontSize: 10, lineHeight: 14, marginTop: 8 },
  });

import { supabase } from '@/lib/supabase';
import type { NutritionDayGoal, NutritionSummaryRow } from '@/types/database';
import { EMPTY_RESOLVED, GOAL_FIELDS, type GoalField, type ResolvedGoals } from '@/lib/nutricion/objetivos';
import { dailySeries, fetchWeights, type DayPoint } from '@/lib/nutricion/peso';
import { addDays } from '@/lib/date';
import type { DateRange } from '@/lib/date-ranges';
import {
  EMPTY_PERIOD_GOAL, EMPTY_SUMMARY,
  type ChartDay, type NutritionSummary, type PeriodGoal,
} from './types';

/**
 * Los promedios se agregan en Postgres, no acá.
 *
 * Es la misma decisión que en Gym: con diez alimentos al día, traerse los
 * registros para agrupar en el cliente obliga a poner un tope de filas, y ese
 * tope trunca la historia a los pocos meses sin avisar. El rango viaja como
 * parámetro en vez de filtrarse después de bajarlo todo.
 */

/** `numeric` de Postgres llega como texto por PostgREST; el `null` se respeta. */
function num(value: number | string | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function maybeNum(value: number | string | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function mapSummary(row: NutritionSummaryRow): NutritionSummary {
  return {
    daysLogged: num(row.days_logged),
    daysComplete: num(row.days_complete),
    daysPartial: num(row.days_partial),
    totalLogs: num(row.total_logs),
    firstDay: row.first_day,
    lastDay: row.last_day,
    avg: {
      kcal: maybeNum(row.avg_kcal),
      protein: maybeNum(row.avg_protein),
      carbs: maybeNum(row.avg_carbs),
      fat: maybeNum(row.avg_fat),
      fiber: maybeNum(row.avg_fiber),
    },
    minKcal: maybeNum(row.min_kcal),
    maxKcal: maybeNum(row.max_kcal),
    sdKcal: maybeNum(row.sd_kcal),
    prev: {
      days: num(row.prev_days),
      kcal: maybeNum(row.prev_avg_kcal),
      protein: maybeNum(row.prev_avg_protein),
    },
    byDay: (row.by_day ?? []).map((d) => ({
      date: d.date,
      kcal: num(d.kcal),
      protein: num(d.protein),
      carbs: num(d.carbs),
      fat: num(d.fat),
      fiber: num(d.fiber),
      items: num(d.items),
      partial: Boolean(d.partial),
    })),
    byMeal: (row.by_meal ?? []).map((m) => ({
      meal: m.meal,
      days: num(m.days),
      kcalPerDay: num(m.kcalPerDay),
      proteinPerDay: num(m.proteinPerDay),
    })),
    topFoods: (row.top_foods ?? []).map((f) => ({
      name: f.name,
      brand: f.brand,
      kcal: num(f.kcal),
      grams: num(f.grams),
      days: num(f.days),
    })),
    incomplete: row.incomplete ?? [],
  };
}

/**
 * Techo de columnas del gráfico. Con «Todo» y un par de días sueltos separados
 * por meses, rellenar los huecos generaría miles de columnas vacías; pasado el
 * tope se cae a los días con dato, que es preferible a una gráfica truncada.
 */
const MAX_COLUMNS = 120;

/** Serie continua entre los extremos con dato: los días sin registro van en null. */
export function chartSeries(summary: NutritionSummary): ChartDay[] {
  const { firstDay, lastDay, byDay } = summary;
  if (!firstDay || !lastDay) return [];

  const byDate = new Map(byDay.map((d) => [d.date, d]));
  const out: ChartDay[] = [];

  let cursor = firstDay;
  while (cursor <= lastDay && out.length < MAX_COLUMNS) {
    out.push({ date: cursor, day: byDate.get(cursor) ?? null });
    cursor = addDays(cursor, 1);
  }

  if (cursor <= lastDay) return byDay.map((d) => ({ date: d.date, day: d }));
  return out;
}

/**
 * El objetivo promedio del rango.
 *
 * Se promedia solo sobre los días que TIENEN objetivo definido: incluir los
 * que vienen en null —porque ese macro no está configurado, o porque todavía no
 * había pesaje— arrastraría la meta hacia abajo y haría parecer que se comió de
 * más.
 */
function averageGoal(days: NutritionDayGoal[]): PeriodGoal {
  const goal = { ...EMPTY_RESOLVED } as ResolvedGoals;

  for (const field of GOAL_FIELDS) {
    const values = days
      .map((d) => d[field as GoalField])
      .filter((v): v is number => v != null)
      .map(Number);
    if (values.length > 0) {
      goal[field] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }

  return { goal, cycleDays: days.filter((d) => d.profile === 'ciclado').length };
}

export type NutritionStatsPayload = {
  summary: NutritionSummary;
  goals: PeriodGoal;
  /** Pesajes promediados por día, ya acotados al rango. */
  weights: DayPoint[];
  error: string | null;
};

/**
 * Las tres lecturas van en paralelo y comparten el rango: son la misma
 * pantalla, y verlas llegar por separado se leería como tres recargas.
 *
 * El peso sale de `fetchWeights` y no de la RPC a propósito: promediar dos
 * pesajes del mismo día y armar la serie ya está resuelto y probado en
 * `lib/nutricion/peso`, y duplicar esa lógica en SQL la haría divergir de la
 * pantalla de Peso.
 */
export async function fetchNutritionStats(range: DateRange): Promise<NutritionStatsPayload> {
  const [summaryRes, goalsRes, weightsRes] = await Promise.all([
    supabase.rpc('nutrition_summary', { p_from: range.from, p_to: range.to }),
    supabase.rpc('nutrition_day_goals', { p_from: range.from, p_to: range.to }),
    fetchWeights(),
  ]);

  const error = summaryRes.error?.message ?? goalsRes.error?.message ?? weightsRes.error ?? null;
  if (error) {
    return { summary: EMPTY_SUMMARY, goals: EMPTY_PERIOD_GOAL, weights: [], error };
  }

  const row = ((summaryRes.data ?? []) as NutritionSummaryRow[])[0];
  const inRange = weightsRes.logs.filter((w) => w.date >= range.from && w.date <= range.to);

  return {
    summary: row ? mapSummary(row) : EMPTY_SUMMARY,
    goals: averageGoal((goalsRes.data ?? []) as NutritionDayGoal[]),
    weights: dailySeries(inRange),
    error: null,
  };
}

import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth-helpers';
import { addDays, toLocalDateStr } from '@/lib/date';
import type { BodyWeightLog } from '@/types/database';

/**
 * Peso corporal: registro y lectura de la evolución.
 *
 * Todo se guarda en kilogramos con la hora exacta del pesaje. Los cálculos de
 * acá arriba no inventan nada: promedian por día y comparan ventanas de siete
 * días, que es lo único que hace legible una serie de peso. El peso diario
 * oscila un kilo largo por agua, sal y digestión: leer la diferencia entre dos
 * pesajes sueltos es leer ruido.
 */

/** Un pesaje con su fecha local ya resuelta, para no recalcularla en cada filtro. */
export type WeighIn = BodyWeightLog & {
  /** `YYYY-MM-DD` en la zona del dispositivo. */
  date: string;
};

/** Un punto de la gráfica: un día, un peso. */
export type DayPoint = {
  date: string;
  kg: number;
  /** Cuántos pesajes se promediaron. >1 cuando se pesó dos veces el mismo día. */
  count: number;
};

export type RangeKey = '30d' | '90d' | 'todo';

export const RANGE_KEYS: readonly RangeKey[] = ['30d', '90d', 'todo'];

export const RANGE_LABELS: Record<RangeKey, string> = {
  '30d': '30 días',
  '90d': '90 días',
  todo: 'Todo',
};

/** Cómo se nombra la variación del período. «En todo» no se lee. */
export const CHANGE_LABELS: Record<RangeKey, string> = {
  '30d': 'En 30 días',
  '90d': 'En 90 días',
  todo: 'Desde el inicio',
};

const RANGE_DAYS: Record<RangeKey, number | null> = { '30d': 30, '90d': 90, todo: null };

/**
 * Límites del campo. No son un juicio sobre el peso de nadie: son el rango
 * fuera del cual lo escrito es con seguridad un error de tecleo.
 */
export const MIN_KG = 20;
export const MAX_KG = 400;

/** Cuántos días entran en el promedio que se lee como tendencia. */
const TREND_DAYS = 7;

/**
 * Techo de filas que se traen. Con un pesaje diario son casi tres años, y la
 * gráfica más larga que ofrece la app es «todo». Va con orden descendente y se
 * invierte acá: recortar por el otro lado dejaría afuera lo reciente, que es
 * justo lo que se mira.
 */
const MAX_ROWS = 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Lo escrito en el campo, o `null` si no es un peso. Acepta coma decimal. */
export function parseKg(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? round2(n) : null;
}

/** '74.3' — un decimal, que es la resolución de una báscula de baño. */
export function formatKg(kg: number): string {
  return round1(kg).toFixed(1);
}

/**
 * '+0.4' · '−0.7' · '='
 *
 * Va con signo y sin color: subir o bajar no es bueno ni malo por sí mismo
 * —depende de si se está en superávit o en déficit— y pintar de rojo una subida
 * sería opinar sobre un objetivo que la app no conoce.
 */
export function formatDelta(diff: number): string {
  const value = round1(diff);
  if (value === 0) return '=';
  // Menos tipográfico (U+2212), no guion: al lado de un número se lee como signo.
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
}

export async function fetchWeights(): Promise<{ logs: WeighIn[]; error: string | null }> {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .select('*')
    .order('measured_at', { ascending: false })
    .limit(MAX_ROWS);

  if (error) return { logs: [], error: error.message };

  const logs = (data ?? [])
    .map((row) => ({
      ...row,
      // `Number()` explícito: PostgREST puede mandar los `numeric` como texto, y
      // ahí toda la aritmética de abajo se volvería concatenación de strings.
      weight_kg: Number(row.weight_kg),
      date: toLocalDateStr(new Date(row.measured_at)),
    }))
    .reverse();

  return { logs, error: null };
}

export async function addWeight(kg: number, note?: string): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  // `measured_at` lo pone el default de la tabla, que es el `now()` del servidor:
  // así la hora del pesaje no depende de que el reloj del teléfono esté puesto.
  const { error } = await supabase.from('body_weight_logs').insert({
    user_id: auth.userId,
    weight_kg: kg,
    note: note?.trim() || null,
  });
  return { error: error?.message ?? null };
}

export async function deleteWeight(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('body_weight_logs').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Primer día que entra en el rango, o `null` si es «todo». */
export function rangeStart(range: RangeKey, today: string): string | null {
  const days = RANGE_DAYS[range];
  return days === null ? null : addDays(today, -(days - 1));
}

/**
 * Un punto por día. Los dos pesajes de un mismo día se promedian: dibujarlos
 * como dos puntos haría que la oscilación de una tarde se lea como pendiente.
 */
export function dailySeries(logs: WeighIn[]): DayPoint[] {
  const byDay = new Map<string, { sum: number; count: number }>();

  for (const log of logs) {
    const slot = byDay.get(log.date) ?? { sum: 0, count: 0 };
    slot.sum += log.weight_kg;
    slot.count += 1;
    byDay.set(log.date, slot);
  }

  return [...byDay]
    .map(([date, { sum, count }]) => ({ date, kg: round2(sum / count), count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Promedio de los puntos que caen en `[from, to]`, o `null` si no hay ninguno. */
function averageBetween(points: DayPoint[], from: string, to: string): number | null {
  const inside = points.filter((p) => p.date >= from && p.date <= to);
  if (inside.length === 0) return null;
  return round2(inside.reduce((sum, p) => sum + p.kg, 0) / inside.length);
}

export type CurrentStats = {
  /** El pesaje más reciente. */
  latest: WeighIn | null;
  /** Contra el pesaje inmediatamente anterior. `null` si es el primero. */
  vsPrevious: number | null;
  /** Promedio de los últimos siete días con dato: la cifra que sí es tendencia. */
  trend: number | null;
  /** Cuánto se movió ese promedio contra los siete días anteriores. */
  trendChange: number | null;
};

/**
 * El estado de hoy. Se calcula sobre la serie completa y no sobre el rango que
 * se esté mirando: cuánto peso hay hoy no cambia porque la gráfica muestre 30
 * días o 90.
 */
export function currentStats(logs: WeighIn[], points: DayPoint[]): CurrentStats {
  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const previous = logs.length > 1 ? logs[logs.length - 2] : null;

  if (!latest || points.length === 0) {
    return { latest, vsPrevious: null, trend: null, trendChange: null };
  }

  // Las ventanas se cuelgan del último día CON dato, no de hoy: quien se pesó
  // por última vez el lunes tiene una tendencia que arranca ahí, no una ventana
  // medio vacía porque hoy es jueves.
  const last = points[points.length - 1].date;
  const trend = averageBetween(points, addDays(last, -(TREND_DAYS - 1)), last);
  const before = averageBetween(
    points,
    addDays(last, -(TREND_DAYS * 2 - 1)),
    addDays(last, -TREND_DAYS)
  );

  return {
    latest,
    vsPrevious: previous ? round1(latest.weight_kg - previous.weight_kg) : null,
    trend,
    trendChange: trend !== null && before !== null ? round1(trend - before) : null,
  };
}

export type RangeSummary = {
  /** Del primer al último punto del rango. `null` con menos de dos puntos. */
  change: number | null;
  min: number | null;
  max: number | null;
};

export function rangeSummary(points: DayPoint[]): RangeSummary {
  if (points.length === 0) return { change: null, min: null, max: null };

  const values = points.map((p) => p.kg);
  return {
    change: points.length > 1 ? round1(points[points.length - 1].kg - points[0].kg) : null,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

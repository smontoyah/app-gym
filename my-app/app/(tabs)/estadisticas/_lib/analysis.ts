import { daysSince } from '@/lib/date';
import type { Direction } from './format';
import type { ExerciseStat, SessionPoint, StaleStat } from './types';

/**
 * Sobre qué se mide el progreso de un ejercicio.
 *
 * Lo normal es el 1RM estimado y no el peso crudo: en un plan a 13 repeticiones,
 * 40 kg × 13 es mejor sesión que 45 kg × 8, y mirando sólo el peso máximo la
 * segunda parecería un progreso.
 *
 * Los ejercicios sin carga (abdominales, extensión de columna) tienen e1RM 0 en
 * todas sus sesiones: ahí el único progreso que existe son las repeticiones.
 */
export type ProgressMetric = 'e1rm' | 'reps';

export const METRIC_LABEL: Record<ProgressMetric, string> = {
  e1rm: '1RM est.',
  reps: 'reps',
};

export function progressMetric(stat: ExerciseStat): ProgressMetric {
  return stat.bestE1rm > 0 ? 'e1rm' : 'reps';
}

export function metricValue(point: SessionPoint, metric: ProgressMetric): number {
  return metric === 'e1rm' ? point.e1rm : point.reps;
}

export type Trend = {
  /** Diferencia contra la media de las sesiones anteriores, en la unidad de la métrica. */
  delta: number;
  pct: number;
  direction: Direction;
  metric: ProgressMetric;
  /** Cuántas sesiones anteriores entraron en la media. */
  baseline: number;
};

/** Cuántas sesiones previas hacen de base. Tres alcanzan para no seguir el ruido. */
const BASELINE_SESSIONS = 3;

/**
 * La última sesión contra la media de las anteriores, no contra la
 * inmediatamente previa: un día flojo aislado no es una caída de tendencia.
 */
export function computeTrend(stat: ExerciseStat): Trend | null {
  if (stat.recent.length < 2) return null;

  const metric = progressMetric(stat);
  const last = metricValue(stat.recent[0], metric);
  const previous = stat.recent.slice(1, 1 + BASELINE_SESSIONS);
  const avg = previous.reduce((sum, p) => sum + metricValue(p, metric), 0) / previous.length;
  if (avg <= 0) return null;

  const delta = Math.round((last - avg) * 10) / 10;
  return {
    delta,
    pct: Math.round(((last - avg) / avg) * 100),
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    metric,
    baseline: previous.length,
  };
}

/** Acentos fuera: buscar «flexion» tiene que encontrar «Flexión». */
const ACCENTS: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c',
};

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[áàäâéèëêíìïîóòöôúùüûñç]/g, (ch) => ACCENTS[ch] ?? ch);
}

export type SortKey = 'recent' | 'progress' | 'volume' | 'name';

export const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Reciente' },
  { key: 'progress', label: 'Progreso' },
  { key: 'volume', label: 'Volumen' },
  { key: 'name', label: 'A-Z' },
];

export function filterStats(
  stats: ExerciseStat[],
  filters: { query: string; muscle: string | null }
): ExerciseStat[] {
  const needle = normalize(filters.query.trim());

  return stats.filter((stat) => {
    if (filters.muscle && stat.muscleGroup !== filters.muscle) return false;
    if (!needle) return true;
    return (
      normalize(stat.name).includes(needle) || normalize(stat.muscleGroup).includes(needle)
    );
  });
}

/**
 * Ordena una copia: la lista que llega es la del fetch y se reordena varias
 * veces sin volver a pedirla.
 */
export function sortStats(stats: ExerciseStat[], key: SortKey): ExerciseStat[] {
  const byName = (a: ExerciseStat, b: ExerciseStat) => a.name.localeCompare(b.name);

  switch (key) {
    case 'recent':
      return [...stats].sort((a, b) => b.lastDate.localeCompare(a.lastDate) || byName(a, b));
    case 'volume':
      return [...stats].sort((a, b) => b.volume - a.volume || byName(a, b));
    case 'name':
      return [...stats].sort(byName);
    case 'progress':
      // Sin tendencia no hay nada que comparar: esos quedan al final.
      return [...stats]
        .map((stat) => ({ stat, pct: computeTrend(stat)?.pct ?? null }))
        .sort((a, b) => {
          if (a.pct === null && b.pct === null) return byName(a.stat, b.stat);
          if (a.pct === null) return 1;
          if (b.pct === null) return -1;
          return b.pct - a.pct || byName(a.stat, b.stat);
        })
        .map((entry) => entry.stat);
  }
}

/** Grupos musculares presentes, para no ofrecer filtros que no filtran nada. */
export function muscleGroups(stats: ExerciseStat[]): string[] {
  return [...new Set(stats.map((s) => s.muscleGroup))].sort((a, b) => a.localeCompare(b));
}

/**
 * A partir de cuántos días sin registrar un ejercicio vale la pena avisar.
 * Una rotación completa de este plan son ~8 días, así que por debajo de dos
 * semanas el aviso sería sólo el ciclo normal de la rutina.
 */
export const STALE_DAYS = 14;

export type StaleEntry = StaleStat & { days: number | null };

/**
 * Ejercicios de la rutina vigente que llevan tiempo sin registrarse.
 * Llegan ya ordenados del servidor (nunca registrados primero, después los más
 * antiguos), así que acá sólo se filtran y se recortan.
 */
export function staleEntries(stale: StaleStat[], limit = 6): StaleEntry[] {
  return stale
    .map((entry) => ({ ...entry, days: entry.lastDate ? daysSince(entry.lastDate) : null }))
    .filter((entry) => entry.days === null || entry.days >= STALE_DAYS)
    .slice(0, limit);
}

import { addDays, todayStr } from '@/lib/date';

/**
 * Los rangos se calculan en hora LOCAL, no en el servidor: en Colombia
 * (UTC-5) el `current_date` de Postgres ya cambió de día a las 19:00 y
 * «últimos 7 días» se habría corrido un día entero.
 */
export type RangeKey = '7d' | '30d' | '90d' | 'all';

export type DateRange = {
  key: RangeKey;
  /** Etiqueta corta del chip. */
  label: string;
  /** Cómo se lee el período en el resumen. */
  title: string;
  from: string;
  to: string;
};

const ALL_FROM = '1900-01-01';
const ALL_TO = '2999-12-31';

/** Ventana de N días que termina hoy (hoy incluido). */
function lastDays(days: number): { from: string; to: string } {
  const to = todayStr();
  return { from: addDays(to, -(days - 1)), to };
}

export function buildRange(key: RangeKey): DateRange {
  switch (key) {
    case '7d':
      return { key, label: '7 días', title: 'Últimos 7 días', ...lastDays(7) };
    case '30d':
      return { key, label: '30 días', title: 'Últimos 30 días', ...lastDays(30) };
    case '90d':
      return { key, label: '90 días', title: 'Últimos 90 días', ...lastDays(90) };
    case 'all':
      return { key, label: 'Todo', title: 'Todo el historial', from: ALL_FROM, to: ALL_TO };
  }
}

export const RANGE_KEYS: readonly RangeKey[] = ['7d', '30d', '90d', 'all'];

/**
 * Con «Todo» no hay período anterior con el que comparar: el delta se calcula
 * igual en el servidor, pero sale de una ventana vacía y compararse contra cero
 * diría «+100 %» en todo. Ahí se esconde.
 */
export function hasComparison(key: RangeKey): boolean {
  return key !== 'all';
}

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

/** Ventana de N días que termina en `today` (ese día incluido). */
function lastDays(days: number, today: string): { from: string; to: string } {
  return { from: addDays(today, -(days - 1)), to: today };
}

/**
 * `today` entra como parámetro para que la pantalla pueda recalcular el rango
 * cuando la app se resume al día siguiente: leyendo el reloj acá adentro, la
 * ventana quedaba terminando ayer hasta que se tocaba otro chip.
 */
export function buildRange(key: RangeKey, today: string = todayStr()): DateRange {
  switch (key) {
    case '7d':
      return { key, label: '7 días', title: 'Últimos 7 días', ...lastDays(7, today) };
    case '30d':
      return { key, label: '30 días', title: 'Últimos 30 días', ...lastDays(30, today) };
    case '90d':
      return { key, label: '90 días', title: 'Últimos 90 días', ...lastDays(90, today) };
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

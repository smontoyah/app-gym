import { addDays, formatLong } from '@/lib/date';

/**
 * El día del diario, sin red: vive aparte de `diario.ts` para poder probarlo
 * sin levantar el cliente de Supabase.
 */

/**
 * Cuántos días por delante de hoy se pueden registrar comidas, para dejar la
 * semana planificada. Lo registrado a futuro es un renglón como cualquier otro:
 * las estadísticas lo ignoran porque cortan en hoy, no porque esté marcado.
 */
export const MAX_DAYS_AHEAD = 7;

/** `YYYY-MM-DD` se ordena igual como texto que como fecha. */
export function canGoForward(day: string, today: string): boolean {
  return day < addDays(today, MAX_DAYS_AHEAD);
}

/** «Hoy», «Mañana» o «Martes 6 de octubre». */
export function dayTitle(day: string, today: string): string {
  if (day === today) return 'Hoy';
  if (day === addDays(today, 1)) return 'Mañana';
  return formatLong(day);
}

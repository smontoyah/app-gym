/**
 * Fechas en hora LOCAL.
 *
 * `toISOString()` devuelve UTC: en Colombia (UTC-5) todo lo registrado después
 * de las 19:00 se guardaba con la fecha del día siguiente, mientras que
 * `getDay()` seguía devolviendo el día local. Esa discrepancia partía las
 * sesiones de la noche en dos fechas distintas.
 */

export const DAY_NAMES_FULL = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `YYYY-MM-DD` en la zona horaria del dispositivo. */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return toLocalDateStr(new Date());
}

/** Interpreta `YYYY-MM-DD` como fecha local (no UTC, como haría `new Date(str)`). */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateStr(dateStr);
  date.setDate(date.getDate() + days);
  return toLocalDateStr(date);
}

export function dayOfWeek(dateStr: string): number {
  return parseDateStr(dateStr).getDay();
}

/** «Lunes 3 de agosto» */
export function formatLong(dateStr: string): string {
  const date = parseDateStr(dateStr);
  return `${DAY_NAMES_FULL[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

/** «3 ago» */
export function formatShort(dateStr: string): string {
  const date = parseDateStr(dateStr);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

/** Primer día del mes actual, en local. */
export function startOfMonthStr(): string {
  const now = new Date();
  return toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** «18:32» — hora local del dispositivo a partir de un timestamp ISO. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Minutos entre dos timestamps ISO. */
export function minutesBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000;
}

/** «1 h 13 min» · «45 min» */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

/**
 * Zona horaria del dispositivo, para que el CSV traiga horas locales y no UTC.
 * Hermes puede venir sin datos de `Intl`; en ese caso decide el servidor.
 */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

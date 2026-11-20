/**
 * Pausas del rest-pause que trae el plan: 15 o 30 s según el ejercicio (la
 * nota de cada uno dice cuál). El cronómetro vibra al cumplir cada una.
 */
export const REST_PAUSE_MARKS = [15, 30] as const;

/** m:ss de un conteo hacia arriba. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * La marca que se acaba de cumplir entre dos lecturas del cronómetro, o null.
 * Si la app vuelve de segundo plano con la marca ya pasada por más de un
 * segundo, no avisa: una vibración tarde manda a repetir la serie a destiempo.
 */
export function markJustReached(
  prevSeconds: number,
  seconds: number,
  marks: readonly number[] = REST_PAUSE_MARKS
): number | null {
  const crossed = marks.filter((m) => prevSeconds < m && m <= seconds);
  if (crossed.length === 0) return null;
  const mark = Math.max(...crossed);
  return seconds - mark <= 1 ? mark : null;
}

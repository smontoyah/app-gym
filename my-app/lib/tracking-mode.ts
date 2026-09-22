import type { TrackingMode } from '@/types/database';

/**
 * Cómo se mide un ejercicio, y la aritmética de minutos ↔ segundos.
 *
 * La base guarda SEGUNDOS y el usuario escribe MINUTOS. La conversión vive
 * únicamente acá: tenerla repetida en la pantalla del día y en estadísticas es
 * cómo se termina con «45 min» en un lado y «44,9 min» en el otro, que es la
 * clase de desacuerdo que hace desconfiar de todo lo demás.
 */

export const TRACKING_MODES = ['carga', 'reps', 'tiempo'] as const;

/** En el selector del formulario, que es angosto. */
export const TRACKING_LABELS: Record<TrackingMode, string> = {
  carga: 'Carga',
  reps: 'Reps',
  tiempo: 'Tiempo',
};

/** Debajo del selector: qué va a pedir cada serie. */
export const TRACKING_HINTS: Record<TrackingMode, string> = {
  carga: 'Repeticiones y peso, como el press banca.',
  reps: 'Solo repeticiones, sin carga externa.',
  tiempo: 'Minutos, como la caminadora o una plancha.',
};

/**
 * Diez horas. Igual que `MAX_REPS` y `MAX_WEIGHT_KG`, no es un límite de
 * entrenamiento sino un filtro de tecleo: atrapa el dígito de más.
 */
export const MAX_DURATION_SECONDS = 36000;

export const usesReps = (mode: TrackingMode) => mode === 'carga' || mode === 'reps';
export const usesWeight = (mode: TrackingMode) => mode === 'carga';
export const usesDuration = (mode: TrackingMode) => mode === 'tiempo';

/**
 * Los minutos escritos, en segundos. `null` si lo escrito no es una duración.
 * Acepta coma decimal, que es lo que ofrece el teclado numérico en español.
 */
export function parseMinutes(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (clean === '') return null;

  const minutes = Number(clean);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  const seconds = Math.round(minutes * 60);
  return seconds > MAX_DURATION_SECONDS ? null : seconds;
}

/**
 * Los segundos guardados, como se escriben en el input. Un decimal como mucho:
 * la diferencia entre 12,5 y 12,51 minutos no existe para quien la teclea.
 */
export function formatMinutes(seconds: number): string {
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return String(minutes);
}

/** '45 min' — para leer, no para editar. */
export function labelDuration(seconds: number): string {
  return `${formatMinutes(seconds)} min`;
}

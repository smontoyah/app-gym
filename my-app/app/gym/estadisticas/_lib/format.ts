/**
 * Formato de números para la pantalla de estadísticas.
 *
 * Se escriben a mano y no con `toLocaleString`: Hermes puede venir sin datos de
 * `Intl` (ya pasó con las fechas) y ahí un separador de miles se cae en
 * silencio. El decimal va con punto, como en el resto de la app.
 *
 * Las variaciones contra el período anterior viven en `@/lib/stats-format`:
 * las comparte con la pantalla de Nutrición y no tienen nada de gym.
 */

/** 860 kg · 8.6 t — el volumen crece rápido, en toneladas se sigue leyendo. */
export function formatVolume(kg: number): string {
  if (kg <= 0) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

/** '42.5' — sin ceros de relleno. */
export function formatKg(kg: number): string {
  return String(Math.round(kg * 10) / 10);
}

export function formatRpe(rpe: number | null): string {
  return rpe === null ? '—' : rpe.toFixed(1);
}

// Los deltas los comparte con Nutrición; se reexportan para no tocar los
// imports de los componentes de esta pantalla.
export {
  absDelta,
  countDelta,
  pctDelta,
  plural,
  type Delta,
  type Direction,
} from '@/lib/stats-format';

/**
 * Formato de números para la pantalla de estadísticas.
 *
 * Se escriben a mano y no con `toLocaleString`: Hermes puede venir sin datos de
 * `Intl` (ya pasó con las fechas) y ahí un separador de miles se cae en
 * silencio. El decimal va con punto, como en el resto de la app.
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

export type Direction = 'up' | 'down' | 'flat';

export type Delta = {
  label: string;
  direction: Direction;
};

const ARROWS: Record<Direction, string> = { up: '↑', down: '↓', flat: '=' };

function direction(diff: number): Direction {
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
}

/**
 * Variación respecto al período anterior. `null` cuando no hay con qué
 * comparar: sin base, un porcentaje es ruido con signo.
 */
export function pctDelta(current: number, previous: number): Delta | null {
  if (previous <= 0) return current > 0 ? { label: 'nuevo', direction: 'up' } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { label: `${ARROWS[direction(pct)]} ${Math.abs(pct)} %`, direction: direction(pct) };
}

export function countDelta(current: number, previous: number): Delta | null {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const dir = direction(diff);
  return { label: `${ARROWS[dir]} ${Math.abs(diff)}`, direction: dir };
}

export function absDelta(current: number | null, previous: number | null): Delta | null {
  if (current === null || previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  const dir = direction(diff);
  return { label: `${ARROWS[dir]} ${Math.abs(diff).toFixed(1)}`, direction: dir };
}

/** '2 sesiones' · '1 sesión' */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

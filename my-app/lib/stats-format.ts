/**
 * Variaciones contra el período anterior, compartidas por las pantallas de
 * estadísticas de Gym y de Nutrición.
 *
 * Los números se arman a mano y no con `toLocaleString`: Hermes puede venir sin
 * datos de `Intl` (ya pasó con las fechas) y ahí un separador de miles se cae en
 * silencio.
 */

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

/** '1.546' — separador de miles con punto, sin depender de `Intl`. */
export function thousands(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '−' : '';
  const digits = String(Math.abs(rounded));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

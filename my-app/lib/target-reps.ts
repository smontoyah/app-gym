/**
 * Las repeticiones que prescribe el entrenador, serie por serie.
 *
 * `routines.target_reps` es texto para que convivan '11', '11/lado' y 'fm'. La
 * fase IMPACTO (S.ASCEN) trajo un caso nuevo: series ascendentes, donde la
 * carga sube y las repeticiones bajan —'14-14-12-10'—. Leído como un solo
 * número (el primero), la sugerencia de carga le exigía 14 repeticiones a la
 * serie de 10 y no proponía subir nunca.
 *
 * El guion es la notación de siempre para un esquema por serie, y no choca con
 * nada de lo que ya había: el entrenador no usa rangos («8-12»). Solo cuenta
 * como esquema si son números separados por guiones y nada más; todo lo demás
 * sigue leyendo el primer número como antes.
 */

const SCHEME = /^\s*\d+(?:\s*-\s*\d+)+\s*$/;

/** '14-14-12-10' → [14, 14, 12, 10] · '11' → [11] · '14/lado' → [14] · 'fm' → null */
export function parseRepScheme(target: string | null): number[] | null {
  if (!target) return null;
  if (SCHEME.test(target)) return target.split('-').map((n) => parseInt(n, 10));
  const match = target.match(/\d+/);
  return match ? [parseInt(match[0], 10)] : null;
}

/**
 * Objetivo de la serie `setNumber` (desde 1). Si la rutina tiene más series que
 * el esquema —alguien sumó una desde Rutinas— se repite el último número.
 */
export function repsForSet(scheme: number[], setNumber: number): number {
  return scheme[Math.min(setNumber, scheme.length) - 1];
}

/**
 * Lo que va de placeholder en la serie: su propio número si hay esquema, y si
 * no el texto tal cual, que es lo que ya se mostraba ('14/lado', 'fm').
 */
export function targetForSet(target: string | null, setNumber: number): string | null {
  if (!target || !SCHEME.test(target)) return target;
  return String(repsForSet(parseRepScheme(target)!, setNumber));
}

/**
 * El RPE contra el que la sugerencia de carga decide si toca subir: si la vez
 * pasada se cumplieron las repeticiones con un RPE promedio igual o menor a
 * este, había margen.
 *
 * `training_phases.rpe_target` es texto: '9/10' hasta IMPACTO, '9-10/10' desde
 * CULMINACIÓN (RIR 0-1). Con un rango manda el TECHO: la fase admite llegar a
 * 10, y la serie rest-pause termina al fallo por diseño. Leyendo el primer
 * número (9), el promedio de cualquier sesión bien hecha lo pasaba y la
 * sugerencia no proponía subir nunca.
 */
export function rpeCeiling(target: string | null | undefined): number | null {
  if (!target) return null;
  const numbers = target.split('/')[0].match(/\d+(?:[.,]\d+)?/g);
  if (!numbers) return null;
  return Math.max(...numbers.map((n) => Number(n.replace(',', '.'))));
}

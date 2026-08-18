/**
 * Unidades de carga.
 *
 * La app registra, calcula y grafica **siempre en kilogramos**: es la unidad de
 * `workout_logs.weight` y la de todo lo que sale de las RPCs (e1RM, volumen,
 * estadísticas, export). La libra existe sólo como unidad de *captura*, porque
 * muchas máquinas vienen graduadas en lb y traducir de cabeza entre series es
 * justo lo que hay que evitar.
 */

export type WeightUnit = 'kg' | 'lb';

export const WEIGHT_UNITS: readonly WeightUnit[] = ['kg', 'lb'];

/**
 * Libra avoirdupois internacional: 1 lb = 0,45359237 kg **exactos**.
 * No es una aproximación de conveniencia, es la definición del acuerdo
 * internacional de la yarda y la libra (1959) que publica el NIST.
 * El otro factor que se ve por ahí, 1 kg = 2,2046226… lb, es su recíproco:
 * de ahí que aquí se divida en vez de multiplicar por una segunda constante,
 * para que kg → lb → kg cierre sin arrastrar error.
 */
export const KG_PER_LB = 0.45359237;

/** Con lo que se persiste el kilo: por debajo de 0,01 kg no hay máquina. */
const KG_DECIMALS = 2;

/** En pantalla la libra va a un decimal; los stacks suben de 5 en 5 lb. */
const LB_DECIMALS = 1;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Número escrito en un input, o `null` si está vacío o no es una carga. */
export function parseWeight(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Lo que el usuario escribió en `unit`, pasado a kg para guardar.
 *
 * De lb se toma la escritura más corta que siga mostrando **esa misma libra**:
 * 220,5 lb se guarda como 100 kg y no como 100,02, mientras 100 lb sí necesita
 * los dos decimales (45,36) porque 45,4 ya se leería 100,1 lb. Con eso, pasar
 * de unidad y volver no ensucia el kilo — que es el dato que queda guardado y
 * el que ve la estadística — y no altera lo que se marcó en la máquina.
 */
export function toKg(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return roundTo(value, KG_DECIMALS);

  const precise = roundTo(value * KG_PER_LB, KG_DECIMALS);
  const tidy = roundTo(precise, 1);
  return fromKg(tidy, 'lb') === roundTo(value, LB_DECIMALS) ? tidy : precise;
}

/** Un peso guardado (kg), pasado a la unidad con la que se está capturando. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? roundTo(kg / KG_PER_LB, LB_DECIMALS) : roundTo(kg, KG_DECIMALS);
}

/** '45.5' · '100' — sin ceros de relleno, como se teclea. */
export function formatWeight(value: number): string {
  return String(roundTo(value, KG_DECIMALS));
}

/** Peso guardado (kg) listo para mostrar en `unit`, con su etiqueta. */
export function labelWeight(kg: number, unit: WeightUnit): string {
  return `${formatWeight(fromKg(kg, unit))} ${unit}`;
}

/**
 * Reinterpreta un input al cambiar de unidad: se conserva la **carga**, no el
 * dígito. Quien tenía 45,4 kg escritos y pasa a lb ve 100, que es lo que dice
 * el pin de la máquina; de ahí sigue sumando placas sin recalcular nada.
 * Un campo vacío o a medio escribir se deja tal cual.
 */
export function convertWeightInput(value: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to) return value;
  const parsed = parseWeight(value);
  if (parsed === null) return value;
  return formatWeight(fromKg(toKg(parsed, from), to));
}

/**
 * Lleva lo que leyó el OCR a la base canónica de 100 g.
 *
 * Vive aparte de `scan.ts` porque es aritmética pura sobre la respuesta del
 * modelo: sin cámara, sin red y sin Supabase. Eso es justo lo que la vuelve
 * testeable, y es la pieza donde un error se propaga a todo el diario.
 */

import type { MacroField, OcrMacros, OcrResult } from './types';

/**
 * Cuánto se les permite discrepar a las dos columnas impresas antes de concluir
 * que no hablan de la misma base. El redondeo de las etiquetas (que publican
 * "13 g" donde la cuenta da 12.67) mueve los números unos pocos puntos; una
 * base distinta los mueve veces enteras. El 20 % separa las dos cosas con aire
 * de sobra para los dos lados.
 */
const BASIS_TOLERANCE = 0.2;

/**
 * Con qué macro se contrastan las columnas, en orden de preferencia.
 *
 * Basta con UNA: si las dos columnas están en bases distintas, todos los campos
 * quedan desfasados por el mismo factor. Se prueban en orden porque cualquiera
 * puede faltar —hay etiquetas sin kcal, solo con kJ— y se prefieren los números
 * grandes, donde el redondeo pesa menos.
 */
const REFERENCE_FIELDS: MacroField[] = [
  'energy_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'sodium_mg',
];

/** Las dos columnas impresas no cuadran entre sí. */
export type BasisMismatch = {
  /** Macro con el que se detectó. */
  field: MacroField;
  /** Lo que decía la columna por 100 g. */
  printed: number;
  /** Lo que implica la columna por porción llevada a 100 g. */
  fromServing: number;
};

export type Per100g = {
  macros: OcrMacros | null;
  /** true si los valores salieron de escalar la columna por porción. */
  derived: boolean;
  mismatch: BasisMismatch | null;
};

const scaleMacros = (m: OcrMacros, factor: number): OcrMacros =>
  Object.fromEntries(
    Object.entries(m).map(([k, v]) => [k, v == null ? null : Math.round(v * factor * 100) / 100])
  ) as OcrMacros;

const hasAnyValue = (m: OcrMacros | null): m is OcrMacros =>
  !!m && Object.values(m).some((v) => v != null);

/**
 * Compara la columna impresa por 100 g contra la porción ya escalada a 100 g.
 * Se corta en el primer macro que sirva de referencia, para bien o para mal:
 * ese campo ya contesta la pregunta, y seguir buscando solo daría la chance de
 * encontrar un campo que "perdone" un desajuste real.
 */
function compareBases(printed: OcrMacros, fromServing: OcrMacros): BasisMismatch | null {
  for (const field of REFERENCE_FIELDS) {
    const a = printed[field];
    const b = fromServing[field];
    // b <= 0 descarta el campo como referencia: un producto de 0 kcal no deja
    // calcular una diferencia relativa (y dividir por 0 daría Infinity).
    if (a == null || b == null || b <= 0) continue;
    return Math.abs(a - b) / b <= BASIS_TOLERANCE ? null : { field, printed: a, fromServing: b };
  }
  return null;
}

/**
 * Normaliza a 100 g del producto TAL COMO SE VENDE.
 *
 * El modelo tiene prohibido derivar una columna de la otra —así no inventa
 * números— así que la conversión la hace la app, que es determinista y
 * auditable. Si la etiqueta solo traía la columna por porción, se escala con el
 * tamaño de porción; sin ese dato no hay forma honesta de normalizar.
 *
 * Cuando vienen las dos columnas se contrastan antes de usar la de 100 g. Hay
 * etiquetas —polvos que se disuelven— cuya columna "por 100 mL" es de la bebida
 * preparada, no del polvo: ahí la columna por porción es la única atada a un
 * peso real de producto, y es la que gana. El desajuste se devuelve para que la
 * pantalla de revisión lo cuente en vez de corregir en silencio.
 */
export function toPer100g(ocr: OcrResult): Per100g {
  let fromServing: OcrMacros | null = null;
  if (hasAnyValue(ocr.per_serving) && ocr.serving_size_g != null && ocr.serving_size_g > 0) {
    fromServing = scaleMacros(ocr.per_serving, 100 / ocr.serving_size_g);
  }

  if (hasAnyValue(ocr.per_100g)) {
    const mismatch = fromServing ? compareBases(ocr.per_100g, fromServing) : null;
    if (fromServing && mismatch) return { macros: fromServing, derived: true, mismatch };
    return { macros: ocr.per_100g, derived: false, mismatch: null };
  }

  if (fromServing) return { macros: fromServing, derived: true, mismatch: null };

  return { macros: null, derived: false, mismatch: null };
}

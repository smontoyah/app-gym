/**
 * Unidad de captura de los alimentos.
 *
 * Las macros del catálogo viven **por 100 g** y el diario guarda **gramos**: es
 * la única base que deja sumar productos distintos y escalar por lo que
 * realmente se comió. Lo que se elige por producto es otra cosa: con qué unidad
 * se **escribe** la cantidad. Nadie pesa dos huevos ni cuatro saltinas, los
 * cuenta; con la equivalencia guardada en la maestra (`unit_weight_g`) la app
 * pide "2 huevos" y persiste 100 g.
 *
 * Todo lo que sale de acá para la base son gramos. La unidad nunca se guarda en
 * el renglón del diario: se deriva del producto al mostrarlo.
 */

import type { IntakeUnit } from '@/types/database';
import { parseNum } from './actions';

/**
 * Lo mínimo que hace falta para traducir entre unidades y gramos. Lo cumplen
 * tanto un producto del catálogo (`FoodProduct`) como un renglón ya resuelto
 * del diario (`NutritionLogMacros`).
 */
export type UnitSpec = {
  intake_unit: IntakeUnit | null;
  unit_weight_g: number | null;
  unit_label: string | null;
};

/** Cantidad tal como se está escribiendo: el texto del input y su unidad. */
export type Quantity = { value: string; unit: IntakeUnit };

/** Con lo que se persiste el gramo: es la escala de `quantity_g` en la base. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/** '100' · '32.5' — sin ceros de relleno, como se teclea. */
export function formatAmount(n: number): string {
  return String(round2(n));
}

/**
 * Peso de una unidad, o `null` si el producto no trae equivalencia utilizable.
 * Los `numeric` de Postgres pueden llegar como texto según el cliente, así que
 * se normaliza acá y no en cada pantalla.
 */
export function unitWeight(spec: UnitSpec | null | undefined): number | null {
  if (spec?.unit_weight_g == null) return null;
  const w = Number(spec.unit_weight_g);
  return Number.isFinite(w) && w > 0 ? w : null;
}

/** true si el producto se puede contar además de pesar. */
export function supportsUnits(spec: UnitSpec | null | undefined): boolean {
  return unitWeight(spec) != null;
}

/**
 * Unidad con la que abrir el campo de cantidad.
 *
 * Se exige el peso de la unidad aunque `intake_unit` diga 'unidad': sin
 * equivalencia no hay conversión posible, y es mejor caer en gramos —que
 * siempre se pueden guardar— que ofrecer un campo que no se puede convertir.
 */
export function intakeUnit(spec: UnitSpec | null | undefined): IntakeUnit {
  return spec?.intake_unit === 'unidad' && supportsUnits(spec) ? 'unidad' : 'g';
}

/**
 * Nombre de la unidad concordado con la cantidad: 1 huevo, 2 huevos,
 * 1 unidad, 3 unidades.
 *
 * La etiqueta se guarda en singular y el plural se arma con la regla simple del
 * español (vocal → +s, consonante → +es, -z → -ces). No cubre irregulares, pero
 * cubre huevo, galleta, arepa, tajada, rebanada, unidad y nuez.
 */
export function unitName(spec: UnitSpec | null | undefined, count = 1): string {
  const singular = spec?.unit_label?.trim() || 'unidad';
  if (Math.abs(count) === 1) return singular;

  const last = singular.slice(-1).toLowerCase();
  if ('aeiou'.includes(last)) return `${singular}s`;
  if (last === 'z') return `${singular.slice(0, -1)}ces`;
  return `${singular}es`;
}

/** Etiqueta corta para el sufijo del input: 'g' o el nombre de la unidad. */
export function unitSuffix(spec: UnitSpec | null | undefined, q: Quantity): string {
  if (q.unit === 'g') return 'g';
  return unitName(spec, parseNum(q.value) ?? 0);
}

/** Cantidad vacía, abierta en la unidad que el producto tenga definida. */
export function emptyQuantity(spec: UnitSpec | null | undefined): Quantity {
  return { value: '', unit: intakeUnit(spec) };
}

/** Gramos guardados → cantidad editable, en la unidad del producto. */
export function quantityFromGrams(grams: number, spec: UnitSpec | null | undefined): Quantity {
  const unit = intakeUnit(spec);
  const w = unitWeight(spec);
  return {
    unit,
    value: formatAmount(unit === 'unidad' && w ? Number(grams) / w : Number(grams)),
  };
}

/**
 * Lo escrito, pasado a gramos para guardar. `null` si está vacío o no es una
 * cantidad válida: quien llama decide qué avisar.
 */
export function quantityToGrams(q: Quantity, spec: UnitSpec | null | undefined): number | null {
  const parsed = parseNum(q.value);
  if (parsed === null || parsed <= 0) return null;
  const w = unitWeight(spec);
  return round2(q.unit === 'unidad' && w ? parsed * w : parsed);
}

/**
 * Reinterpreta el input al cambiar de unidad: se conserva la **cantidad de
 * comida**, no el dígito. Quien tenía 2 huevos escritos y pasa a gramos ve 100.
 * Un campo vacío o a medio escribir se deja tal cual.
 */
export function convertQuantity(q: Quantity, to: IntakeUnit, spec: UnitSpec | null | undefined): Quantity {
  if (q.unit === to) return q;
  const w = unitWeight(spec);
  const parsed = parseNum(q.value);
  if (!w || parsed === null) return { ...q, unit: to };
  return {
    unit: to,
    value: formatAmount(to === 'g' ? parsed * w : parsed / w),
  };
}

/**
 * Cómo se lee una cantidad ya guardada: "2 huevos · 100 g" para lo que se
 * cuenta, "150 g" para lo que se pesa. Los gramos se muestran igual porque son
 * el dato con el que se calculó todo lo demás.
 */
export function formatQuantity(grams: number, spec: UnitSpec | null | undefined): string {
  const g = Number(grams);
  const w = unitWeight(spec);
  if (intakeUnit(spec) !== 'unidad' || !w) return `${formatAmount(g)} g`;

  const units = round2(g / w);
  return `${formatAmount(units)} ${unitName(spec, units)} · ${formatAmount(g)} g`;
}

/** Solo la parte contada: "2 huevos" — o los gramos si el producto se pesa. */
export function formatQuantityShort(grams: number, spec: UnitSpec | null | undefined): string {
  const g = Number(grams);
  const w = unitWeight(spec);
  if (intakeUnit(spec) !== 'unidad' || !w) return `${formatAmount(g)} g`;

  const units = round2(g / w);
  return `${formatAmount(units)} ${unitName(spec, units)}`;
}

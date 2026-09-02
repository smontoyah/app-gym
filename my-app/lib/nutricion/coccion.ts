/**
 * Conversión crudo ↔ cocido.
 *
 * Un alimento cambia de peso al cocinarse —el arroz absorbe agua y pesa el
 * doble, la carne la suelta y pierde un cuarto— pero sus macros no viajan con
 * el agua. Por eso la fila del catálogo vale para UNA sola forma: 100 g de
 * arroz seco son 360 kcal y 100 g del mismo arroz cocido, 130.
 *
 * La maestra guarda dos cosas:
 *  · `base_state`       : en qué forma están las macros por 100 g, que es
 *                         también la forma en la que se guarda `quantity_g`.
 *  · `cooked_yield_pct` : cuántos gramos cocidos salen de 100 g crudos. 250 en
 *                         el arroz (gana), 75 en la pechuga (pierde).
 *
 * Con las dos, el diario puede aceptar el peso que de verdad tocó la balanza,
 * esté en la forma que esté, y guardar siempre gramos de la forma base. Lo que
 * se convierte son los GRAMOS: las macros nunca se tocan.
 */

import type { CookingSpec, FoodState } from '@/types/database';
import { formatAmount, formatQuantity, type UnitSpec } from './unidades';

export const FOOD_STATES: FoodState[] = ['crudo', 'cocido'];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Gramos cocidos por cada gramo crudo. `null` si el producto no lo declara. */
export function cookingFactor(spec: CookingSpec | null | undefined): number | null {
  if (spec?.cooked_yield_pct == null) return null;
  const pct = Number(spec.cooked_yield_pct);
  return Number.isFinite(pct) && pct > 0 ? pct / 100 : null;
}

/** La forma en la que están las macros del producto. */
export function baseState(spec: CookingSpec | null | undefined): FoodState | null {
  return spec?.base_state ?? null;
}

/**
 * true cuando el producto se puede anotar en las dos formas. Hacen falta las
 * dos cosas: sin la forma base no se sabe desde dónde convertir, y sin el
 * rendimiento no hay con qué.
 */
export function supportsCooking(spec: CookingSpec | null | undefined): boolean {
  return baseState(spec) != null && cookingFactor(spec) != null;
}

/** La otra forma: la que ofrece el selector del diario junto a la base. */
export function otherState(state: FoodState): FoodState {
  return state === 'crudo' ? 'cocido' : 'crudo';
}

/** "crudo" · "cocidos" — concordado para poder pegarlo detrás de los gramos. */
export function stateLabel(state: FoodState, plural = false): string {
  return plural ? `${state}s` : state;
}

/** Con mayúscula inicial, para los chips. */
export function stateTitle(state: FoodState): string {
  return state === 'crudo' ? 'Crudo' : 'Cocido';
}

/**
 * Cuántos gramos de `to` representa 1 g de `from`. Es el mismo número con el
 * que convierte `convertState`, sin redondear: sirve para reescalar cuentas
 * hechas contra la otra forma (por ejemplo un conteo de unidades).
 */
export function stateRatio(
  from: FoodState,
  to: FoodState,
  spec: CookingSpec | null | undefined
): number {
  const factor = cookingFactor(spec);
  if (from === to || factor === null) return 1;
  return from === 'crudo' ? factor : 1 / factor;
}

/** Gramos de una forma a la otra. Sin rendimiento cargado no convierte nada. */
export function convertState(
  grams: number,
  from: FoodState,
  to: FoodState,
  spec: CookingSpec | null | undefined
): number {
  return round2(grams * stateRatio(from, to, spec));
}

/** Lo pesado, llevado a la forma en la que se guarda (`quantity_g`). */
export function toBaseGrams(
  grams: number,
  state: FoodState | null,
  spec: CookingSpec | null | undefined
): number {
  const base = baseState(spec);
  if (!state || !base || !supportsCooking(spec)) return round2(grams);
  return convertState(grams, state, base, spec);
}

/** Lo guardado, devuelto a la forma en la que se pesó. */
export function fromBaseGrams(
  grams: number,
  state: FoodState | null,
  spec: CookingSpec | null | undefined
): number {
  const base = baseState(spec);
  if (!state || !base || !supportsCooking(spec)) return round2(grams);
  return convertState(grams, base, state, spec);
}

/**
 * Cuánto cambia de peso al cocinarse, dicho como lo diría alguien en la cocina.
 * `null` si al producto le falta alguno de los dos datos.
 */
export function yieldSummary(spec: CookingSpec | null | undefined): string | null {
  const factor = cookingFactor(spec);
  if (factor === null || factor === 1) return factor === 1 ? 'No cambia de peso al cocinarse.' : null;

  const pct = Math.round(Math.abs(factor - 1) * 100);
  const cocidos = round2(100 * factor);
  const crudos = round2(100 / factor);

  return factor > 1
    ? `Gana ${pct} % de peso: 100 g crudos rinden ${cocidos} g cocidos, y 100 g cocidos salen de ${crudos} g crudos.`
    : `Pierde ${pct} % de peso: 100 g crudos quedan en ${cocidos} g cocidos, y 100 g cocidos salen de ${crudos} g crudos.`;
}

/**
 * Cómo se lee una cantidad ya resuelta a gramos de la forma base.
 *
 * Cuando se pesó en la otra forma manda lo que dijo la balanza y los gramos
 * guardados van detrás: quien anotó 200 g de arroz cocido tiene que reconocer
 * su renglón, no encontrarse con los 80 g crudos que la app usó para la cuenta.
 */
export function describeQuantity(params: {
  /** Gramos en la forma base: lo que está guardado en `quantity_g`. */
  baseG: number;
  /** Para poder decir "2 huevos · 100 g" en lo que se cuenta. */
  units: UnitSpec | null | undefined;
  cooking: CookingSpec | null | undefined;
  loggedState: FoodState | null;
}): string {
  const { baseG, units, cooking, loggedState } = params;
  const base = baseState(cooking);
  const shown = formatQuantity(baseG, units);

  if (!base) return shown;
  if (!loggedState || loggedState === base || !supportsCooking(cooking)) {
    return `${shown} ${stateLabel(base, true)}`;
  }

  const weighed = fromBaseGrams(baseG, loggedState, cooking);
  return `${formatAmount(weighed)} g ${stateLabel(loggedState, true)} · ${shown} ${stateLabel(base, true)}`;
}

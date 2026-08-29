import type { MealSlot } from '@/types/database';

/** Un día del rango con sus totales ya sumados en Postgres. */
export type DayNutrition = {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  items: number;
  /** Registro abandonado: se dibuja marcado, pero queda fuera de los promedios. */
  partial: boolean;
};

export type MealStat = {
  meal: MealSlot;
  /** Días en que ESA comida se registró. Es el divisor del promedio, no el rango. */
  days: number;
  kcalPerDay: number;
  proteinPerDay: number;
};

export type FoodStat = {
  name: string;
  brand: string | null;
  kcal: number;
  grams: number;
  days: number;
};

export type MacroAverages = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
};

export type NutritionSummary = {
  daysLogged: number;
  daysComplete: number;
  daysPartial: number;
  totalLogs: number;
  /** Extremos CON dato dentro del rango; null si no hay ninguno. */
  firstDay: string | null;
  lastDay: string | null;
  /** Sobre los días completos. */
  avg: MacroAverages;
  minKcal: number | null;
  maxKcal: number | null;
  /** null con un solo día completo: no hay dispersión que medir. */
  sdKcal: number | null;
  prev: { days: number; kcal: number | null; protein: number | null };
  byDay: DayNutrition[];
  byMeal: MealStat[];
  topFoods: FoodStat[];
  /** Productos del rango con alguna macro en null: el total queda por debajo. */
  incomplete: string[];
};

export const EMPTY_SUMMARY: NutritionSummary = {
  daysLogged: 0,
  daysComplete: 0,
  daysPartial: 0,
  totalLogs: 0,
  firstDay: null,
  lastDay: null,
  avg: { kcal: null, protein: null, carbs: null, fat: null, fiber: null },
  minKcal: null,
  maxKcal: null,
  sdKcal: null,
  prev: { days: 0, kcal: null, protein: null },
  byDay: [],
  byMeal: [],
  topFoods: [],
  incomplete: [],
};

/**
 * Una columna del gráfico. `day` en null es un día del rango sin ningún
 * registro: se deja el hueco a la vista en vez de pegar dos días vecinos, que
 * disimularía el olvido.
 */
export type ChartDay = { date: string; day: DayNutrition | null };

import type { GoalProfile, NutritionGoals } from '@/types/database';

/**
 * Cómo se escribe un objetivo y cómo se vuelve gramos.
 *
 * Los macros se prescriben por kilo de peso corporal, así que es el ratio lo
 * que se guarda: 170 g de proteína son 2,2 g/kg a 77 kg y 2,4 a 71, y lo que no
 * cambia entre esos dos días es el 2,2. Las calorías y la fibra no siguen esa
 * regla — son números puestos a mano.
 *
 * La multiplicación vive solo acá. Repetida en el diario, en objetivos y en
 * estadísticas es cómo se llega a tres cifras distintas para la misma meta.
 */

/**
 * Las cinco que se siguen contra el objetivo.
 *
 * Viven acá y no en `diario.ts` porque este módulo no toca la red: `diario.ts`
 * importa el cliente de Supabase, y con la constante allá cualquier test de
 * esta aritmética arrastraba AsyncStorage y los módulos nativos detrás. El
 * módulo puro va abajo; el que hace I/O, encima.
 */
export const GOAL_FIELDS = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;
export type GoalField = (typeof GOAL_FIELDS)[number];

export const GOAL_LABELS: Record<GoalField, string> = {
  energy_kcal: 'Calorías',
  protein_g: 'Proteína',
  carbs_g: 'Carbos',
  fat_g: 'Grasa',
  fiber_g: 'Fibra',
};

/** Con qué unidad se LEE cada objetivo, que no es con la que se escribe. */
export const GOAL_UNITS: Record<GoalField, string> = {
  energy_kcal: 'kcal',
  protein_g: 'g',
  carbs_g: 'g',
  fat_g: 'g',
  fiber_g: 'g',
};

export const GOAL_PROFILES: readonly GoalProfile[] = ['normal', 'ciclado'];

export const PROFILE_LABELS: Record<GoalProfile, string> = {
  normal: 'Día normal',
  ciclado: 'Día de ciclado',
};

/** Los que se escriben por kilo. */
export const PER_KG_FIELDS = ['protein_g', 'carbs_g', 'fat_g'] as const;
export type PerKgField = (typeof PER_KG_FIELDS)[number];

/** Qué columna de la base guarda el ratio de cada macro. */
export const PER_KG_COLUMN = {
  protein_g: 'protein_g_kg',
  carbs_g: 'carbs_g_kg',
  fat_g: 'fat_g_kg',
} as const satisfies Record<PerKgField, keyof NutritionGoals>;

export function isPerKg(field: GoalField): field is PerKgField {
  return (PER_KG_FIELDS as readonly string[]).includes(field);
}

/** Con qué unidad se ESCRIBE cada objetivo, que no es con la que se lee. */
export const GOAL_INPUT_UNITS: Record<GoalField, string> = {
  energy_kcal: 'kcal',
  protein_g: 'g/kg',
  carbs_g: 'g/kg',
  fat_g: 'g/kg',
  fiber_g: 'g',
};

/** Lo que guarda la tabla, tal como lo espera el upsert. */
export type GoalValues = {
  energy_kcal: number | null;
  protein_g_kg: number | null;
  carbs_g_kg: number | null;
  fat_g_kg: number | null;
  fiber_g: number | null;
};

/** Un objetivo ya en gramos, que es lo único contra lo que se compara el día. */
export type ResolvedGoals = Record<GoalField, number | null>;

export const EMPTY_RESOLVED: Readonly<ResolvedGoals> = Object.freeze(
  Object.fromEntries(GOAL_FIELDS.map((f) => [f, null])) as ResolvedGoals
);

/**
 * El objetivo del día en gramos.
 *
 * Los macros por kilo quedan en `null` si no hay un peso con qué resolverlos:
 * mostrar un cero ahí sería decir que la meta es no comer proteína, que es lo
 * contrario de «todavía no te pesaste».
 */
export function resolveGoals(
  goals: NutritionGoals | null,
  weightKg: number | null
): ResolvedGoals {
  const out = { ...EMPTY_RESOLVED };
  if (!goals) return out;

  // `Number()` explícito en todo: PostgREST manda los `numeric` como texto, y
  // sin esto una suma de kcal en otra pantalla concatenaría en vez de sumar.
  out.energy_kcal = goals.energy_kcal == null ? null : Number(goals.energy_kcal);
  out.fiber_g = goals.fiber_g == null ? null : Number(goals.fiber_g);

  const usable = weightKg !== null && Number.isFinite(weightKg) && weightKg > 0;
  if (!usable) return out;

  for (const field of PER_KG_FIELDS) {
    const ratio = goals[PER_KG_COLUMN[field]];
    out[field] = ratio == null ? null : Math.round(Number(ratio) * weightKg * 10) / 10;
  }
  return out;
}

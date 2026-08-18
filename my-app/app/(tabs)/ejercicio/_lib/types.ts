import type {
  CardioLog,
  CardioPlan,
  RoutineWithExercise,
  TrainingPhase,
} from '@/types/database';
import type { WeightUnit } from '@/lib/units';

export type SetLog = {
  set_number: number;
  reps: string;
  /** Lo que se ve en el input: está en `weightUnit` del ejercicio, no en kg. */
  weight: string;
  rpe: string;
  saved: boolean;
  /** Referencia de la sesión previa. En kg, que es como se guarda. */
  previous?: { weightKg: number; reps: number; rpe: number | null };
};

/** Datos de una serie tal como salen de los inputs, sin convertir todavía. */
export type SetInput = {
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
};

/**
 * Sugerencia de carga para hoy. Se guarda el número en kg y se decide el texto
 * al pintarlo, para poder decirlo en la unidad con la que se está capturando.
 */
export type LoadSuggestion = {
  action: 'increase' | 'hold-rpe' | 'hold-reps';
  weightKg: number;
  targetReps: number;
};

export type ExerciseWithSets = RoutineWithExercise & {
  sets_data: SetLog[];
  /** Unidad de captura de este ejercicio; el guardado siempre va en kg. */
  weightUnit: WeightUnit;
  /** Fecha de la sesión previa usada como referencia. */
  previousDate?: string;
  /** Sugerencia de carga derivada de esa sesión previa. */
  suggestion?: LoadSuggestion;
};

/**
 * Un bloque es o bien un ejercicio suelto, o bien una super serie:
 * varios ejercicios encadenados que se ejecutan sin descanso entre ellos.
 */
export type WorkoutBlock = {
  key: string;
  supersetGroup: string | null;
  exercises: ExerciseWithSets[];
};

export type CardioEntry = {
  plan: CardioPlan | null;
  log: CardioLog | null;
};

/**
 * Ventana de la jornada: del primer input al último, cardio incluido.
 * Es lo mismo que calcula `export_training_data` para el CSV.
 */
export type SessionWindow = {
  start: string;
  end: string;
};

export type DayWorkout = {
  blocks: WorkoutBlock[];
  cardio: CardioEntry;
  phase: TrainingPhase | null;
  /** `null` mientras no se haya guardado nada ese día. */
  session: SessionWindow | null;
};

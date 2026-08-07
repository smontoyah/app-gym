import type {
  CardioLog,
  CardioPlan,
  RoutineWithExercise,
  TrainingPhase,
} from '@/types/database';

export type SetLog = {
  set_number: number;
  reps: string;
  weight: string;
  rpe: string;
  saved: boolean;
  previousReps?: string;
  previousWeight?: string;
  previousRpe?: string;
};

export type ExerciseWithSets = RoutineWithExercise & {
  sets_data: SetLog[];
  /** Fecha de la sesión previa usada como referencia. */
  previousDate?: string;
  /** Sugerencia de carga derivada de esa sesión previa. */
  suggestion?: string;
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

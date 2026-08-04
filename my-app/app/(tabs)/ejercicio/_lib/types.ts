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

export type DayWorkout = {
  blocks: WorkoutBlock[];
  cardio: CardioEntry;
  phase: TrainingPhase | null;
};

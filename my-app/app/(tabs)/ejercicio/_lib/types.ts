import type { RoutineWithExercise } from '@/types/database';

export type SetLog = {
  set_number: number;
  reps: string;
  weight: string;
  saved: boolean;
};

export type ExerciseWithSets = RoutineWithExercise & {
  sets_data: SetLog[];
};

export type RecentSession = {
  date: string;
  weight: number;
  reps: number;
  /** 1RM estimado por Epley: peso × (1 + reps/30). */
  e1rm: number;
  volume: number;
  rpe: number | null;
  sets: number;
};

export type ExerciseStat = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  totalSessions: number;
  lastDate: string;
  lastWeight: number;
  maxWeight: number;
  lastE1rm: number;
  bestE1rm: number;
  recent: RecentSession[];
};

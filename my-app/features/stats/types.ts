import type { Exercise } from '@/types/database';

export type RecentLog = {
  date: string;
  weight: number;
  reps: number;
};

export type ExerciseStat = {
  exercise: Exercise;
  lastWeight: number;
  maxWeight: number;
  totalSessions: number;
  recentLogs: RecentLog[];
};

export type SessionPoint = {
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
  /** Del rango consultado. */
  sessions: number;
  sets: number;
  volume: number;
  avgRpe: number | null;
  lastDate: string;
  lastWeight: number;
  lastReps: number;
  lastE1rm: number;
  /** De siempre, para que el récord no dependa del rango que se esté mirando. */
  maxWeight: number;
  bestE1rm: number;
  prDate: string;
  /** Sesiones del rango, de la más reciente a la más antigua. */
  recent: SessionPoint[];
};

export type DayStat = {
  date: string;
  sets: number;
  volume: number;
  rpe: number | null;
  exercises: number;
  cardioMinutes: number;
  /** Minutos entre el primer y el último input de la jornada. */
  durationMin: number | null;
};

export type MuscleStat = {
  group: string;
  sets: number;
  volume: number;
  sessions: number;
};

export type RecordStat = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  date: string;
  e1rm: number;
  prevBest: number;
};

export type StaleStat = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  /** `null` = está en la rutina pero nunca se registró. */
  lastDate: string | null;
};

/** Totales del período, con los del anterior de igual longitud al lado. */
export type TrainingSummary = {
  sessions: number;
  sets: number;
  volume: number;
  avgRpe: number | null;
  exercises: number;
  avgDurationMin: number | null;
  cardioSessions: number;
  cardioMinutes: number;
  prev: {
    sessions: number;
    sets: number;
    volume: number;
    avgRpe: number | null;
  };
  byDay: DayStat[];
  byMuscle: MuscleStat[];
  records: RecordStat[];
  stale: StaleStat[];
};

export const EMPTY_SUMMARY: TrainingSummary = {
  sessions: 0,
  sets: 0,
  volume: 0,
  avgRpe: null,
  exercises: 0,
  avgDurationMin: null,
  cardioSessions: 0,
  cardioMinutes: 0,
  prev: { sessions: 0, sets: 0, volume: 0, avgRpe: null },
  byDay: [],
  byMuscle: [],
  records: [],
  stale: [],
};

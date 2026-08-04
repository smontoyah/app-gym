export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  /** Ilustración del movimiento (la del PDF del entrenador). */
  image_url: string | null;
  created_at: string;
};

export type Routine = {
  id: string;
  user_id: string;
  day_of_week: number;
  exercise_id: string;
  sets: number;
  sort_order: number;
  created_at: string;
  /** Repeticiones objetivo prescritas por el entrenador: '13', '18', '13 c/u'. */
  target_reps: string | null;
  /** Descanso prescrito entre series; 0 = super serie encadenada. */
  rest_seconds: number | null;
  /** Cadencia concéntrica-isométrica-excéntrica: '1-0-2'. */
  cadence: string | null;
  /** Misma etiqueta = misma super serie. */
  superset_group: string | null;
  notes: string | null;
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  exercise_id: string;
  workout_date: string;
  set_number: number;
  reps: number;
  weight: number;
  /** Esfuerzo percibido 1-10. La fase se define por RPE, no solo por carga. */
  rpe: number | null;
  created_at: string;
};

/** Mesociclo: «FASE – AJUSTE 1» y las que vengan después. */
export type TrainingPhase = {
  id: string;
  user_id: string;
  name: string;
  started_on: string;
  rpe_target: string | null;
  rir_target: string | null;
  method: string | null;
  warmup: string | null;
  is_active: boolean;
  created_at: string;
};

export type CardioPlan = {
  id: string;
  user_id: string;
  day_of_week: number;
  modality: string;
  target_minutes: number;
  created_at: string;
};

export type CardioLog = {
  id: string;
  user_id: string;
  workout_date: string;
  minutes: number;
  modality: string | null;
  created_at: string;
};

export type RoutineWithExercise = Routine & {
  exercises: Exercise;
};

/** Fila devuelta por la función `exercise_stats`. */
export type ExerciseStatsRow = {
  exercise_id: string;
  name: string;
  muscle_group: string;
  total_sessions: number;
  last_date: string;
  last_weight: number;
  max_weight: number;
  last_e1rm: number;
  best_e1rm: number;
  recent: {
    date: string;
    weight: number;
    reps: number;
    e1rm: number;
    volume: number;
    rpe: number | null;
    sets: number;
  }[];
};

/** Fila devuelta por la función `previous_sets`. */
export type PreviousSetRow = {
  exercise_id: string;
  workout_date: string;
  set_number: number;
  reps: number;
  weight: number;
  rpe: number | null;
};

/** Fila devuelta por la función `export_training_data`. */
export type ExportRow = {
  tipo: string;
  fecha: string;
  dia_semana: string;
  ejercicio: string;
  grupo_muscular: string;
  serie: number | null;
  reps_objetivo: string | null;
  reps: number | null;
  peso_kg: number | null;
  rpe: number | null;
  e1rm_kg: number | null;
  volumen_kg: number | null;
  minutos: number | null;
  descanso_prescrito_s: number | null;
  cadencia: string | null;
  super_serie: string | null;
  fase: string | null;
  registrado_en: string;
};

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: Exercise;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          muscle_group: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          muscle_group?: string;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      routines: {
        Row: Routine;
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          exercise_id: string;
          sets?: number;
          sort_order?: number;
          created_at?: string;
          target_reps?: string | null;
          rest_seconds?: number | null;
          cadence?: string | null;
          superset_group?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          day_of_week?: number;
          exercise_id?: string;
          sets?: number;
          sort_order?: number;
          created_at?: string;
          target_reps?: string | null;
          rest_seconds?: number | null;
          cadence?: string | null;
          superset_group?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routines_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          workout_date?: string;
          set_number: number;
          reps: number;
          weight: number;
          rpe?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          workout_date?: string;
          set_number?: number;
          reps?: number;
          weight?: number;
          rpe?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_logs_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      training_phases: {
        Row: TrainingPhase;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          started_on: string;
          rpe_target?: string | null;
          rir_target?: string | null;
          method?: string | null;
          warmup?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          started_on?: string;
          rpe_target?: string | null;
          rir_target?: string | null;
          method?: string | null;
          warmup?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      cardio_plan: {
        Row: CardioPlan;
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          modality: string;
          target_minutes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day_of_week?: number;
          modality?: string;
          target_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cardio_logs: {
        Row: CardioLog;
        Insert: {
          id?: string;
          user_id: string;
          workout_date?: string;
          minutes: number;
          modality?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_date?: string;
          minutes?: number;
          modality?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      swap_routine_order: {
        Args: { p_a: string; p_b: string };
        Returns: undefined;
      };
      move_routine_to_day: {
        Args: { p_source: number; p_target: number };
        Returns: number;
      };
      swap_routine_days: {
        Args: { p_a: number; p_b: number };
        Returns: number;
      };
      exercise_stats: {
        Args: { p_sessions?: number };
        Returns: ExerciseStatsRow[];
      };
      previous_sets: {
        Args: { p_before: string; p_exercise_ids: string[] };
        Returns: PreviousSetRow[];
      };
      export_training_data: {
        Args: { p_from: string; p_to: string };
        Returns: ExportRow[];
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};

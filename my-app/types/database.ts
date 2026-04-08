export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
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
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  exercise_id: string;
  workout_date: string;
  set_number: number;
  reps: number;
  weight: number;
  created_at: string;
};

export type RoutineWithExercise = Routine & {
  exercises: Exercise;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          muscle_group?: string;
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
        };
        Update: {
          id?: string;
          user_id?: string;
          day_of_week?: number;
          exercise_id?: string;
          sets?: number;
          sort_order?: number;
          created_at?: string;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

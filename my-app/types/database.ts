export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  /**
   * Ilustración animada del movimiento (WebP 180×180 en el bucket público
   * `exercises`). Null mientras el ejercicio no esté vinculado al dataset.
   */
  image_url: string | null;
  /**
   * Id del movimiento en el dataset de referencia, 4 dígitos: '0599'. Es el
   * vínculo que hace que dos nombres distintos del mismo ejercicio sean el
   * mismo ejercicio, y con el que se regeneran ilustración y pasos.
   */
  dataset_id: string | null;
  /** Pasos de ejecución en español. Copiados del dataset, no referenciados. */
  instructions: string[] | null;
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
  /** Primer guardado de esta serie: es la marca que delimita la jornada. */
  created_at: string;
  /** Último retoque (corrección de reps, peso o RPE). Lo pone un trigger. */
  updated_at: string;
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
  updated_at: string;
};

/**
 * Producto del catálogo de nutrición.
 * Las macros son SIEMPRE por 100 g: es la única base que permite sumar
 * productos distintos y escalar por los gramos realmente consumidos.
 */
/**
 * Unidad con la que se ESCRIBE la cantidad. Los cálculos y lo que se guarda
 * siguen siendo gramos: esto es solo la unidad de captura.
 */
export type IntakeUnit = 'g' | 'unidad';

/**
 * En qué forma se pesó el alimento. Un mismo alimento cambia hasta 40 % de
 * densidad calórica al cocerse (arroz seco 360 kcal/100 g, cocido 130), así que
 * la forma es parte del dato: sin ella los gramos no significan nada.
 */
export type FoodState = 'crudo' | 'cocido';

/**
 * Lo mínimo para convertir gramos entre crudo y cocido. Lo cumplen tanto un
 * producto del catálogo como un renglón ya resuelto del diario.
 */
export type CookingSpec = {
  /** Forma en la que están las macros por 100 g. null → el producto no lo declara. */
  base_state: FoodState | null;
  /** Gramos cocidos que salen de 100 g crudos: 250 el arroz, 75 la pechuga. */
  cooked_yield_pct: number | null;
};

export type FoodProduct = {
  id: string;
  /**
   * Quién lo cargó, no quién lo puede ver: el catálogo es compartido y todos
   * leen todos los productos. Solo el autor los edita o los borra.
   */
  user_id: string;
  name: string;
  brand: string | null;
  package_size_g: number | null;
  serving_size_g: number | null;
  /** Literal impreso en la etiqueta: "1 cucharada (15 g)". */
  serving_label: string | null;
  servings_per_package: number | null;
  /** Con qué unidad se abre el campo de cantidad en el diario. */
  intake_unit: IntakeUnit;
  /**
   * Cuánto pesa UNA unidad: 1 huevo, 1 galleta, 1 arepa. No es
   * `serving_size_g`: la porción de la etiqueta suele traer varias unidades
   * ("5 galletas (32,5 g)"). Obligatorio si `intake_unit` es 'unidad'.
   */
  unit_weight_g: number | null;
  /** Nombre de la unidad en singular: "huevo", "galleta". null → "unidad". */
  unit_label: string | null;
  /** Forma en la que están las macros de abajo, y en la que se guardan los gramos. */
  base_state: FoodState | null;
  /** Rendimiento al cocinar: gramos cocidos por cada 100 g crudos. */
  cooked_yield_pct: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  added_sugars_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_mg: number | null;
  sodium_mg: number | null;
  /** Ruta dentro del bucket privado, no URL: las firmadas caducan. */
  label_photo_path: string | null;
  front_photo_path: string | null;
  /** Respuesta cruda del OCR: permite reprocesar sin volver a fotografiar. */
  ocr_raw: unknown | null;
  ocr_model: string | null;
  ocr_confidence: number | null;
  /** El usuario revisó y confirmó lo que extrajo el modelo. */
  verified: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Fila de `food_product_usage`: cuántos registros usan un producto. Los ajenos
 * se cuentan aparte porque la RLS no los deja ver desde el cliente, y son los
 * que explican un borrado que Postgres rechaza sin que la app sepa por qué.
 */
export type FoodProductUsage = {
  own_logs: number;
  other_logs: number;
  own_items: number;
  other_items: number;
};

export type MealSlot = 'desayuno' | 'almuerzo' | 'cena' | 'snack';

export type NutritionLog = {
  id: string;
  user_id: string;
  /** Exactamente uno de product_id / recipe_id está lleno. */
  product_id: string | null;
  recipe_id: string | null;
  /** Fecha local del usuario, no UTC. */
  logged_on: string;
  meal: MealSlot;
  /** Siempre en la forma base del producto, sea cual sea la que se pesó. */
  quantity_g: number;
  /** En qué forma se pesó, cuando el producto acepta las dos. */
  logged_state: FoodState | null;
  note: string | null;
  created_at: string;
};

export type NutritionLogWithProduct = NutritionLog & {
  food_products: FoodProduct;
};

/** Contador diario de escaneos. Solo lo escribe la Edge Function. */
export type OcrUsage = {
  user_id: string;
  used_on: string;
  scans: number;
};

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  /**
   * Peso del preparado terminado, en la balanza. NO es la suma de los
   * ingredientes: al cocinar se evapora agua (un guiso pesa menos) o se
   * absorbe (el arroz pesa más). Es la base contra la que se escala una
   * porción servida. Si es null se usa la suma de ingredientes, que es lo
   * correcto para preparados en frío donde no hay pérdida.
   */
  yield_g: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipeItem = {
  id: string;
  user_id: string;
  recipe_id: string;
  product_id: string;
  quantity_g: number;
  sort_order: number;
  created_at: string;
};

export type RecipeItemWithProduct = RecipeItem & {
  food_products: FoodProduct;
};

/** Fila de la vista `recipe_nutrition`: macros totales del preparado. */
export type RecipeNutrition = {
  recipe_id: string;
  user_id: string;
  name: string;
  yield_g: number | null;
  ingredients_g: number;
  /** yield_g si se midió, si no la suma de ingredientes. */
  total_g: number;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  added_sugars_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_mg: number | null;
  sodium_mg: number | null;
};

/** Fila de la vista `nutrition_log_macros`: un renglón del diario ya resuelto. */
export type NutritionLogMacros = {
  id: string;
  user_id: string;
  logged_on: string;
  meal: MealSlot;
  quantity_g: number;
  logged_state: FoodState | null;
  note: string | null;
  created_at: string;
  product_id: string | null;
  recipe_id: string | null;
  source_name: string;
  source_type: 'producto' | 'receta';
  /** Unidad de presentación del producto; null en las recetas, que van en gramos. */
  intake_unit: IntakeUnit | null;
  unit_weight_g: number | null;
  unit_label: string | null;
  /** Los dos datos de cocción del producto; null en las recetas. */
  base_state: FoodState | null;
  cooked_yield_pct: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  added_sugars_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_mg: number | null;
  sodium_mg: number | null;
};

/** Meta diaria de macros. Una fila por usuario, se edita a mano. */
export type NutritionGoals = {
  user_id: string;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  updated_at: string;
};

/**
 * Un pesaje del usuario.
 *
 * La hora forma parte del dato: entre el peso en ayunas y el de la noche hay más
 * de un kilo, así que dos pesajes del mismo día solo son comparables si se sabe
 * a qué hora se tomó cada uno.
 */
export type BodyWeightLog = {
  id: string;
  user_id: string;
  weight_kg: number;
  /** Timestamp ISO del pesaje. Se muestra en la hora local del dispositivo. */
  measured_at: string;
  note: string | null;
  created_at: string;
};

export type RoutineWithExercise = Routine & {
  exercises: Exercise;
};

/** Fila devuelta por la función `exercise_stats`, acotada al rango pedido. */
export type ExerciseStatsRow = {
  exercise_id: string;
  name: string;
  muscle_group: string;
  /** Sesiones dentro del rango (una sesión = este ejercicio en un día). */
  sessions: number;
  sets: number;
  volume: number;
  avg_rpe: number | null;
  last_date: string;
  last_weight: number;
  last_reps: number;
  last_e1rm: number;
  /** De siempre, no del rango: un récord no deja de serlo por mirar una semana. */
  max_weight: number;
  best_e1rm: number;
  pr_date: string;
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

/** Fila devuelta por la función `training_summary`. */
export type TrainingSummaryRow = {
  /** Días con algo registrado, cardio incluido. */
  sessions: number;
  sets: number;
  volume: number;
  avg_rpe: number | null;
  exercises: number;
  avg_duration_min: number | null;
  cardio_sessions: number;
  cardio_minutes: number;
  /** Los mismos totales del período anterior de igual longitud. */
  prev_sessions: number;
  prev_sets: number;
  prev_volume: number;
  prev_avg_rpe: number | null;
  by_day: {
    date: string;
    sets: number;
    volume: number;
    rpe: number | null;
    exercises: number;
    minutes: number;
    /** Minutos entre el primer y el último input de la jornada. */
    duration: number | null;
  }[];
  by_muscle: { group: string; sets: number; volume: number; sessions: number }[];
  /** Sesiones que superaron a todas las anteriores de ese ejercicio. */
  records: {
    exerciseId: string;
    name: string;
    muscleGroup: string;
    date: string;
    e1rm: number;
    prevBest: number;
  }[];
  /** Ejercicios de la rutina vigente con su último registro; `null` = nunca. */
  stale: {
    exerciseId: string;
    name: string;
    muscleGroup: string;
    lastDate: string | null;
  }[];
};

/** Fila devuelta por la función `previous_sets`. */
/**
 * Fila devuelta por `nutrition_summary` para el rango pedido.
 *
 * Los promedios salen de los días COMPLETOS: un día con tres alimentos sueltos
 * es un registro abandonado y, si promediara, hundiría la media varios cientos
 * de kcal. Ese día igual viaja en `by_day` marcado, para poder dibujarlo.
 */
export type NutritionSummaryRow = {
  days_logged: number;
  days_complete: number;
  days_partial: number;
  total_logs: number;
  /** Primer y último día CON registro dentro del rango; null si no hay ninguno. */
  first_day: string | null;
  last_day: string | null;
  avg_kcal: number | null;
  avg_protein: number | null;
  avg_carbs: number | null;
  avg_fat: number | null;
  avg_fiber: number | null;
  min_kcal: number | null;
  max_kcal: number | null;
  /** null con un solo día completo: no hay dispersión que medir. */
  sd_kcal: number | null;
  /** Mismos promedios del período anterior de igual longitud. */
  prev_days: number;
  prev_avg_kcal: number | null;
  prev_avg_protein: number | null;
  by_day: {
    date: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    items: number;
    partial: boolean;
  }[];
  /** Promedio por día EN QUE SE REGISTRÓ esa comida; `days` es el divisor. */
  by_meal: { meal: MealSlot; days: number; kcalPerDay: number; proteinPerDay: number }[];
  top_foods: { name: string; brand: string | null; kcal: number; grams: number; days: number }[];
  /** Productos del rango con alguna macro en null: el total queda por debajo. */
  incomplete: string[];
};

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
  /** Hora local (`p_tz`) del primer guardado de la fila. */
  registrado_en: string;
  /** Hora local del último retoque de la fila. */
  actualizado_en: string;
  /** Primer input de la jornada, repetido en todas las filas de esa fecha. */
  inicio_sesion: string | null;
  /** Último input de la jornada. */
  fin_sesion: string | null;
  /** Minutos entre el primer y el último input de la jornada. */
  duracion_sesion_min: number | null;
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
          dataset_id?: string | null;
          instructions?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          muscle_group?: string;
          image_url?: string | null;
          dataset_id?: string | null;
          instructions?: string[] | null;
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
      food_products: {
        Row: FoodProduct;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          package_size_g?: number | null;
          serving_size_g?: number | null;
          serving_label?: string | null;
          servings_per_package?: number | null;
          intake_unit?: IntakeUnit;
          unit_weight_g?: number | null;
          unit_label?: string | null;
          base_state?: FoodState | null;
          cooked_yield_pct?: number | null;
          energy_kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          sugars_g?: number | null;
          added_sugars_g?: number | null;
          fiber_g?: number | null;
          fat_g?: number | null;
          saturated_fat_g?: number | null;
          trans_fat_mg?: number | null;
          sodium_mg?: number | null;
          label_photo_path?: string | null;
          front_photo_path?: string | null;
          ocr_raw?: unknown | null;
          ocr_model?: string | null;
          ocr_confidence?: number | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          brand?: string | null;
          package_size_g?: number | null;
          serving_size_g?: number | null;
          serving_label?: string | null;
          servings_per_package?: number | null;
          intake_unit?: IntakeUnit;
          unit_weight_g?: number | null;
          unit_label?: string | null;
          base_state?: FoodState | null;
          cooked_yield_pct?: number | null;
          energy_kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          sugars_g?: number | null;
          added_sugars_g?: number | null;
          fiber_g?: number | null;
          fat_g?: number | null;
          saturated_fat_g?: number | null;
          trans_fat_mg?: number | null;
          sodium_mg?: number | null;
          label_photo_path?: string | null;
          front_photo_path?: string | null;
          ocr_raw?: unknown | null;
          ocr_model?: string | null;
          ocr_confidence?: number | null;
          verified?: boolean;
        };
        Relationships: [];
      };
      nutrition_logs: {
        Row: NutritionLog;
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          recipe_id?: string | null;
          logged_on: string;
          meal: MealSlot;
          quantity_g: number;
          logged_state?: FoodState | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          product_id?: string | null;
          recipe_id?: string | null;
          logged_on?: string;
          meal?: MealSlot;
          quantity_g?: number;
          logged_state?: FoodState | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'nutrition_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'food_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nutrition_logs_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      ocr_usage: {
        Row: OcrUsage;
        Insert: { user_id: string; used_on: string; scans?: number };
        Update: { scans?: number };
        Relationships: [];
      };
      recipes: {
        Row: Recipe;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          notes?: string | null;
          yield_g?: number | null;
        };
        Update: {
          name?: string;
          notes?: string | null;
          yield_g?: number | null;
        };
        Relationships: [];
      };
      recipe_items: {
        Row: RecipeItem;
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          product_id: string;
          quantity_g: number;
          sort_order?: number;
        };
        Update: { quantity_g?: number; sort_order?: number };
        Relationships: [
          {
            foreignKeyName: 'recipe_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'food_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recipe_items_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      nutrition_goals: {
        Row: NutritionGoals;
        Insert: {
          user_id: string;
          energy_kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
        };
        Update: {
          energy_kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
        };
        Relationships: [];
      };
      body_weight_logs: {
        Row: BodyWeightLog;
        Insert: {
          id?: string;
          user_id: string;
          weight_kg: number;
          measured_at?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          weight_kg?: number;
          measured_at?: string;
          note?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      recipe_nutrition: { Row: RecipeNutrition; Relationships: [] };
      nutrition_log_macros: { Row: NutritionLogMacros; Relationships: [] };
    };
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
        Args: { p_from?: string; p_to?: string; p_sessions?: number };
        Returns: ExerciseStatsRow[];
      };
      training_summary: {
        Args: { p_from?: string; p_to?: string };
        Returns: TrainingSummaryRow[];
      };
      nutrition_summary: {
        Args: {
          p_from?: string;
          p_to?: string;
          /** Días con este número de ítems o menos quedan fuera de los promedios. */
          p_partial_max?: number;
          p_foods?: number;
        };
        Returns: NutritionSummaryRow[];
      };
      previous_sets: {
        Args: { p_before: string; p_exercise_ids: string[] };
        Returns: PreviousSetRow[];
      };
      export_training_data: {
        Args: { p_from: string; p_to: string; p_tz?: string };
        Returns: ExportRow[];
      };
      food_product_usage: {
        Args: { p_product_id: string };
        Returns: FoodProductUsage[];
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};

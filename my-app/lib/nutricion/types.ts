/**
 * Formas que devuelve la Edge Function `ocr-nutricion`.
 * El modelo transcribe; los cálculos los hace la app (ver `toPer100g`).
 */

export type OcrMacros = {
  energy_kcal: number | null;
  energy_kj: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  added_sugars_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_mg: number | null;
  sodium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  zinc_mg: number | null;
  vitamin_a_ug: number | null;
  vitamin_d_ug: number | null;
};

export type OcrResult = {
  product_name: string | null;
  /** null si el logo estaba tapado: entonces mirá `brand_visible_text`. */
  brand: string | null;
  /** Fragmento que sí se alcanzó a leer, ej. "...atti". */
  brand_visible_text: string | null;
  package_size_g: number | null;
  serving_size_g: number | null;
  serving_label: string | null;
  servings_per_package: number | null;
  per_serving: OcrMacros | null;
  per_100g: OcrMacros | null;
  printed_columns: ('per_serving' | 'per_100g')[];
  /** Campos que el modelo declaró ilegibles. La UI los marca para revisión. */
  unreadable_fields: string[];
  confidence: number;
  notes: string | null;
};

export type OcrResponse = {
  data: OcrResult;
  meta: {
    model: string;
    images: number;
    elapsed_ms: number;
    usage: { totalTokenCount?: number } | null;
  };
};

/** Las diez macros que se guardan como columnas, siempre por 100 g. */
export const MACRO_FIELDS = [
  'energy_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'saturated_fat_g',
  'trans_fat_mg',
  'sugars_g',
  'added_sugars_g',
  'fiber_g',
  'sodium_mg',
] as const;

export type MacroField = (typeof MACRO_FIELDS)[number];

export const MACRO_LABELS: Record<MacroField, string> = {
  energy_kcal: 'Calorías (kcal)',
  protein_g: 'Proteína (g)',
  carbs_g: 'Carbohidratos (g)',
  fat_g: 'Grasa total (g)',
  saturated_fat_g: 'Grasa saturada (g)',
  trans_fat_mg: 'Grasa trans (mg)',
  sugars_g: 'Azúcares (g)',
  added_sugars_g: 'Azúcares añadidos (g)',
  fiber_g: 'Fibra (g)',
  sodium_mg: 'Sodio (mg)',
};

/** Estado editable del formulario de revisión. Todo string: son inputs. */
export type ProductDraft = {
  name: string;
  brand: string;
  package_size_g: string;
  serving_size_g: string;
  serving_label: string;
  servings_per_package: string;
} & Record<MacroField, string>;

/** Borrador vacío: punto de partida tanto del escaneo como de la carga manual. */
export const EMPTY_DRAFT: ProductDraft = {
  name: '',
  brand: '',
  package_size_g: '',
  serving_size_g: '',
  serving_label: '',
  servings_per_package: '',
  ...(Object.fromEntries(MACRO_FIELDS.map((f) => [f, ''])) as Record<MacroField, string>),
};

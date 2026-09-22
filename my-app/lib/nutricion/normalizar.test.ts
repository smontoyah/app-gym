import { toPer100g } from './normalizar';
import type { OcrMacros, OcrResult } from './types';

const NADA: OcrMacros = {
  energy_kcal: null,
  energy_kj: null,
  protein_g: null,
  carbs_g: null,
  sugars_g: null,
  added_sugars_g: null,
  fiber_g: null,
  fat_g: null,
  saturated_fat_g: null,
  trans_fat_mg: null,
  sodium_mg: null,
  calcium_mg: null,
  iron_mg: null,
  zinc_mg: null,
  vitamin_a_ug: null,
  vitamin_d_ug: null,
};

const macros = (v: Partial<OcrMacros>): OcrMacros => ({ ...NADA, ...v });

const ocr = (v: Partial<OcrResult>): OcrResult => ({
  product_name: null,
  brand: null,
  brand_visible_text: null,
  package_size_g: null,
  serving_size_g: null,
  serving_label: null,
  preparation: null,
  servings_per_package: null,
  per_serving: null,
  per_100g: null,
  per_100ml_prepared: null,
  printed_columns: [],
  unreadable_fields: [],
  confidence: 1,
  notes: null,
  ...v,
});

describe('toPer100g', () => {
  it('usa la columna por 100 g cuando está impresa', () => {
    const r = toPer100g(
      ocr({
        serving_size_g: 30,
        per_100g: macros({ energy_kcal: 380, protein_g: 12 }),
        per_serving: macros({ energy_kcal: 114, protein_g: 3.6 }),
        printed_columns: ['per_100g', 'per_serving'],
      })
    );

    expect(r.macros?.energy_kcal).toBe(380);
    expect(r.derived).toBe(false);
    expect(r.mismatch).toBeNull();
  });

  it('escala la porción cuando la etiqueta solo trae esa columna', () => {
    const r = toPer100g(
      ocr({
        serving_size_g: 30,
        per_serving: macros({ energy_kcal: 114, protein_g: 3.6 }),
        printed_columns: ['per_serving'],
      })
    );

    expect(r.macros?.energy_kcal).toBe(380);
    expect(r.macros?.protein_g).toBe(12);
    expect(r.derived).toBe(true);
    expect(r.mismatch).toBeNull();
  });

  it('sin columna por 100 g y sin tamaño de porción no inventa nada', () => {
    const r = toPer100g(
      ocr({ per_serving: macros({ energy_kcal: 114 }), printed_columns: ['per_serving'] })
    );

    expect(r.macros).toBeNull();
    expect(r.derived).toBe(false);
  });

  it('una etiqueta sin macros legibles devuelve null, no ceros', () => {
    const r = toPer100g(ocr({ serving_size_g: 30, per_serving: macros({}), per_100g: macros({}) }));
    expect(r.macros).toBeNull();
  });

  // El caso que rompió el whey de Sin Intermediarios: la columna que el modelo
  // metió en per_100g era "por 100 mL" de la bebida ya preparada, seis veces más
  // diluida que el polvo. La porción es la única atada a un peso real.
  it('desconfía de la columna por 100 g cuando no cuadra con la porción', () => {
    const r = toPer100g(
      ocr({
        serving_size_g: 33,
        per_100g: macros({ energy_kcal: 65, protein_g: 12, sodium_mg: 24 }),
        per_serving: macros({ energy_kcal: 130, protein_g: 23, sodium_mg: 49 }),
        printed_columns: ['per_100g', 'per_serving'],
      })
    );

    expect(r.derived).toBe(true);
    expect(r.macros?.energy_kcal).toBe(393.94);
    expect(r.macros?.protein_g).toBe(69.7);
    expect(r.macros?.sodium_mg).toBe(148.48);
    expect(r.mismatch).toEqual({ field: 'energy_kcal', printed: 65, fromServing: 393.94 });
  });

  it('el redondeo de la etiqueta no cuenta como desajuste', () => {
    // 1.9 g por porción de 15 g dan 12.67 por 100 g; la etiqueta imprime 13.
    const r = toPer100g(
      ocr({
        serving_size_g: 15,
        per_100g: macros({ energy_kcal: 400, protein_g: 13 }),
        per_serving: macros({ energy_kcal: 60, protein_g: 1.9 }),
      })
    );

    expect(r.mismatch).toBeNull();
    expect(r.derived).toBe(false);
  });

  it('una porción de 100 g hace idénticas las dos columnas, y eso está bien', () => {
    const r = toPer100g(
      ocr({
        serving_size_g: 100,
        per_100g: macros({ energy_kcal: 89 }),
        per_serving: macros({ energy_kcal: 89 }),
      })
    );

    expect(r.mismatch).toBeNull();
    expect(r.macros?.energy_kcal).toBe(89);
  });

  it('un producto sin calorías compara con el siguiente macro, no divide por cero', () => {
    const r = toPer100g(
      ocr({
        serving_size_g: 200,
        per_100g: macros({ energy_kcal: 0, protein_g: 0, sodium_mg: 5 }),
        per_serving: macros({ energy_kcal: 0, protein_g: 0, sodium_mg: 10 }),
      })
    );

    expect(r.mismatch).toBeNull();
    expect(r.derived).toBe(false);
  });

  it('sin la columna por porción no hay con qué contrastar: se usa lo impreso', () => {
    const r = toPer100g(
      ocr({ serving_size_g: 33, per_100g: macros({ energy_kcal: 65 }), printed_columns: ['per_100g'] })
    );

    expect(r.macros?.energy_kcal).toBe(65);
    expect(r.derived).toBe(false);
    expect(r.mismatch).toBeNull();
  });

  it('la columna de 100 mL preparado no se usa jamás como base', () => {
    const r = toPer100g(
      ocr({
        serving_size_g: 33,
        preparation: 'en 200 mL de agua',
        per_serving: macros({ energy_kcal: 130, protein_g: 23 }),
        per_100ml_prepared: macros({ energy_kcal: 65, protein_g: 12 }),
        printed_columns: ['per_serving', 'per_100ml_prepared'],
      })
    );

    expect(r.macros?.energy_kcal).toBe(393.94);
    expect(r.derived).toBe(true);
    expect(r.mismatch).toBeNull();
  });
});

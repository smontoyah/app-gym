import type { NutritionGoals } from '@/types/database';
import { isPerKg, resolveGoals } from './objetivos';

const NORMAL: NutritionGoals = {
  user_id: 'u1',
  profile: 'normal',
  energy_kcal: 1850,
  protein_g_kg: 2.2,
  carbs_g_kg: 2.08,
  fat_g_kg: 0.82,
  fiber_g: 30,
  updated_at: '2026-09-21T00:00:00Z',
};

describe('isPerKg', () => {
  it('los tres macros van por kilo', () => {
    expect(isPerKg('protein_g')).toBe(true);
    expect(isPerKg('carbs_g')).toBe(true);
    expect(isPerKg('fat_g')).toBe(true);
  });

  it('calorías y fibra son absolutas: se prescriben así, no por peso', () => {
    expect(isPerKg('energy_kcal')).toBe(false);
    expect(isPerKg('fiber_g')).toBe(false);
  });
});

describe('resolveGoals', () => {
  it('multiplica los macros por el peso y redondea a un decimal', () => {
    const r = resolveGoals(NORMAL, 77.1);
    expect(r.protein_g).toBe(169.6);
    expect(r.carbs_g).toBe(160.4);
    expect(r.fat_g).toBe(63.2);
  });

  it('deja calorías y fibra como están', () => {
    const r = resolveGoals(NORMAL, 77.1);
    expect(r.energy_kcal).toBe(1850);
    expect(r.fiber_g).toBe(30);
  });

  it('sigue al peso: a 71 kg los mismos g/kg dan menos gramos', () => {
    expect(resolveGoals(NORMAL, 71).protein_g).toBe(156.2);
  });

  it('sin pesaje no inventa un gramaje: los macros quedan en null', () => {
    const r = resolveGoals(NORMAL, null);
    expect(r.protein_g).toBeNull();
    expect(r.carbs_g).toBeNull();
    expect(r.fat_g).toBeNull();
  });

  it('sin pesaje las absolutas siguen valiendo: no dependen del peso', () => {
    const r = resolveGoals(NORMAL, null);
    expect(r.energy_kcal).toBe(1850);
    expect(r.fiber_g).toBe(30);
  });

  it('un macro sin definir queda en null, no en cero', () => {
    const r = resolveGoals({ ...NORMAL, carbs_g_kg: null }, 77.1);
    expect(r.carbs_g).toBeNull();
    expect(r.protein_g).toBe(169.6);
  });

  it('sin objetivo cargado devuelve todo en null', () => {
    const r = resolveGoals(null, 77.1);
    expect(r.energy_kcal).toBeNull();
    expect(r.protein_g).toBeNull();
  });

  it('un peso absurdo no produce un objetivo absurdo', () => {
    expect(resolveGoals(NORMAL, 0).protein_g).toBeNull();
    expect(resolveGoals(NORMAL, -5).protein_g).toBeNull();
  });

  it('acepta los numeric que PostgREST manda como texto', () => {
    // Sin el Number() explícito, '2.2' * 77.1 funcionaría por coerción pero
    // '2.2' == null daría false y un null de la base pasaría como 0.
    const asText = { ...NORMAL, protein_g_kg: '2.2' as unknown as number };
    expect(resolveGoals(asText, 77.1).protein_g).toBe(169.6);
  });
});

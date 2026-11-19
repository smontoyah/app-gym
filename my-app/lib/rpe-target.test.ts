import { rpeCeiling } from './rpe-target';

describe('rpeCeiling', () => {
  it('un objetivo fijo se lee tal cual: las fases hasta IMPACTO', () => {
    expect(rpeCeiling('9/10')).toBe(9);
    expect(rpeCeiling('7/10')).toBe(7);
  });

  it('en un rango manda el techo: CULMINACIÓN (RIR 0-1)', () => {
    expect(rpeCeiling('9-10/10')).toBe(10);
    expect(rpeCeiling('8 - 9 / 10')).toBe(9);
  });

  it('sin objetivo no hay techo', () => {
    expect(rpeCeiling(null)).toBeNull();
    expect(rpeCeiling(undefined)).toBeNull();
    expect(rpeCeiling('')).toBeNull();
    expect(rpeCeiling('alto')).toBeNull();
  });
});

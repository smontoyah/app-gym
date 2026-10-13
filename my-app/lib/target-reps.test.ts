import { parseRepScheme, repsForSet, targetForSet } from './target-reps';

describe('parseRepScheme', () => {
  it('lee un esquema por serie: las series ascendentes de IMPACTO', () => {
    expect(parseRepScheme('14-14-12-10')).toEqual([14, 14, 12, 10]);
    expect(parseRepScheme('14 - 12 - 10')).toEqual([14, 12, 10]);
  });

  it('un número solo vale para todas las series', () => {
    expect(parseRepScheme('11')).toEqual([11]);
  });

  it('lo que trae texto después del número sigue leyendo el primero', () => {
    expect(parseRepScheme('14/lado')).toEqual([14]);
    expect(parseRepScheme('13 c/u')).toEqual([13]);
  });

  it('sin número no hay objetivo: al fallo, vacío o null', () => {
    expect(parseRepScheme('fm')).toBeNull();
    expect(parseRepScheme('')).toBeNull();
    expect(parseRepScheme(null)).toBeNull();
  });
});

describe('repsForSet', () => {
  it('toma el de la serie, contando desde 1', () => {
    expect(repsForSet([14, 14, 12, 10], 1)).toBe(14);
    expect(repsForSet([14, 14, 12, 10], 3)).toBe(12);
    expect(repsForSet([14, 14, 12, 10], 4)).toBe(10);
  });

  it('si la rutina tiene más series que el esquema, repite el último', () => {
    expect(repsForSet([14, 12, 10], 4)).toBe(10);
    expect(repsForSet([11], 3)).toBe(11);
  });
});

describe('targetForSet', () => {
  it('en un esquema, cada serie muestra su propio número', () => {
    expect(targetForSet('14-14-12-10', 1)).toBe('14');
    expect(targetForSet('14-14-12-10', 4)).toBe('10');
  });

  it('fuera de un esquema devuelve el texto tal cual', () => {
    expect(targetForSet('14/lado', 2)).toBe('14/lado');
    expect(targetForSet('fm', 1)).toBe('fm');
    expect(targetForSet(null, 1)).toBeNull();
  });
});

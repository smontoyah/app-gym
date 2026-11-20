import { formatClock, markJustReached, REST_PAUSE_MARKS } from './rest-pause';

describe('REST_PAUSE_MARKS', () => {
  it('son las dos pausas que trae el plan de CULMINACIÓN', () => {
    expect(REST_PAUSE_MARKS).toEqual([15, 30]);
  });
});

describe('formatClock', () => {
  it('cuenta hacia arriba en m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(30)).toBe('0:30');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(600)).toBe('10:00');
  });

  it('un reloj adelantado del teléfono no muestra negativos', () => {
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('markJustReached', () => {
  it('avisa al cruzar cada marca', () => {
    expect(markJustReached(14, 15)).toBe(15);
    expect(markJustReached(29, 30)).toBe(30);
  });

  it('un tick lento que salta un segundo igual avisa', () => {
    expect(markJustReached(14, 16)).toBe(15);
  });

  it('sin cruzar marca no avisa', () => {
    expect(markJustReached(0, 0)).toBeNull();
    expect(markJustReached(15, 15)).toBeNull();
    expect(markJustReached(16, 29)).toBeNull();
    expect(markJustReached(30, 45)).toBeNull();
  });

  it('al volver de segundo plano tarde no vibra: el aviso ya no sirve', () => {
    expect(markJustReached(5, 40)).toBeNull();
    expect(markJustReached(10, 20)).toBeNull();
  });

  it('acepta otras marcas', () => {
    expect(markJustReached(19, 20, [20])).toBe(20);
  });
});

import { MAX_DAYS_AHEAD, canGoForward, dayTitle } from './dia';

const TODAY = '2026-10-04';

describe('canGoForward', () => {
  it('desde hoy y los días pasados se puede avanzar', () => {
    expect(canGoForward(TODAY, TODAY)).toBe(true);
    expect(canGoForward('2026-09-20', TODAY)).toBe(true);
  });

  it('se puede avanzar hasta el último día de la ventana, no más allá', () => {
    expect(MAX_DAYS_AHEAD).toBe(7);
    expect(canGoForward('2026-10-10', TODAY)).toBe(true);
    expect(canGoForward('2026-10-11', TODAY)).toBe(false);
  });

  it('la ventana cruza el cambio de mes', () => {
    expect(canGoForward('2026-10-30', '2026-10-28')).toBe(true);
    expect(canGoForward('2026-11-04', '2026-10-28')).toBe(false);
  });

  it('si el día quedó fuera de la ventana, no deja seguir avanzando', () => {
    expect(canGoForward('2026-10-20', TODAY)).toBe(false);
  });
});

describe('dayTitle', () => {
  it('hoy y mañana se nombran', () => {
    expect(dayTitle(TODAY, TODAY)).toBe('Hoy');
    expect(dayTitle('2026-10-05', TODAY)).toBe('Mañana');
  });

  it('el resto de los días, pasados o futuros, van con la fecha larga', () => {
    expect(dayTitle('2026-10-03', TODAY)).toBe('Sábado 3 de octubre');
    expect(dayTitle('2026-10-06', TODAY)).toBe('Martes 6 de octubre');
  });
});

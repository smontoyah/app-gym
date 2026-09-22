import {
  formatMinutes,
  labelDuration,
  MAX_DURATION_SECONDS,
  parseMinutes,
  usesDuration,
  usesReps,
  usesWeight,
} from './tracking-mode';

describe('parseMinutes', () => {
  it('lee minutos enteros', () => {
    expect(parseMinutes('45')).toBe(2700);
  });

  it('acepta coma decimal, que es lo que ofrece el teclado en español', () => {
    expect(parseMinutes('12,5')).toBe(750);
  });

  it('acepta punto decimal', () => {
    expect(parseMinutes('12.5')).toBe(750);
  });

  it('redondea al segundo: 0,7 min son 42 s, no 42,000000001', () => {
    expect(parseMinutes('0,7')).toBe(42);
  });

  it('rechaza el vacío, la basura y el cero', () => {
    expect(parseMinutes('')).toBeNull();
    expect(parseMinutes('  ')).toBeNull();
    expect(parseMinutes('abc')).toBeNull();
    expect(parseMinutes('0')).toBeNull();
    expect(parseMinutes('-5')).toBeNull();
  });

  it('rechaza lo que pasa del tope de tecleo', () => {
    expect(parseMinutes('600')).toBe(MAX_DURATION_SECONDS);
    expect(parseMinutes('601')).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('vuelve al mismo número que se escribió', () => {
    expect(formatMinutes(2700)).toBe('45');
  });

  it('muestra un decimal solo cuando hace falta', () => {
    expect(formatMinutes(750)).toBe('12.5');
    expect(formatMinutes(600)).toBe('10');
  });

  it('ida y vuelta sin pérdida en los valores que se tipean', () => {
    for (const written of ['45', '10', '12.5', '1']) {
      expect(formatMinutes(parseMinutes(written) as number)).toBe(written);
    }
  });
});

describe('labelDuration', () => {
  it('dice la unidad, que es lo que se lee en la tarjeta', () => {
    expect(labelDuration(2700)).toBe('45 min');
    expect(labelDuration(750)).toBe('12.5 min');
  });
});

describe('qué campos pide cada modo', () => {
  it('carga pide reps y peso', () => {
    expect(usesReps('carga')).toBe(true);
    expect(usesWeight('carga')).toBe(true);
    expect(usesDuration('carga')).toBe(false);
  });

  it('reps pide solo repeticiones', () => {
    expect(usesReps('reps')).toBe(true);
    expect(usesWeight('reps')).toBe(false);
    expect(usesDuration('reps')).toBe(false);
  });

  it('tiempo pide solo minutos', () => {
    expect(usesReps('tiempo')).toBe(false);
    expect(usesWeight('tiempo')).toBe(false);
    expect(usesDuration('tiempo')).toBe(true);
  });
});

import { NOTE_MAX_LENGTH, parseNote } from './workout-notes';

describe('parseNote', () => {
  it('quita los espacios y saltos de línea de los bordes', () => {
    expect(parseNote('  Hice hack squat, la prensa estaba ocupada \n')).toEqual({
      ok: true,
      note: 'Hice hack squat, la prensa estaba ocupada',
    });
  });

  it('el texto vacío significa borrar la nota', () => {
    expect(parseNote('')).toEqual({ ok: true, note: null });
    expect(parseNote('   \n\t ')).toEqual({ ok: true, note: null });
  });

  it('respeta los saltos de línea de adentro', () => {
    expect(parseNote('Serie 3 con 20 kg\nme dolió el hombro')).toEqual({
      ok: true,
      note: 'Serie 3 con 20 kg\nme dolió el hombro',
    });
  });

  it('acepta justo el máximo, medido después de recortar', () => {
    const exact = 'a'.repeat(NOTE_MAX_LENGTH);
    expect(parseNote(`  ${exact}  `)).toEqual({ ok: true, note: exact });
  });

  it('rechaza lo que pasa del máximo', () => {
    const result = parseNote('a'.repeat(NOTE_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(String(NOTE_MAX_LENGTH));
  });
});

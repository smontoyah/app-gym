import { MIN_PASSWORD_LENGTH, passwordChangeProblem } from './password';

const valid = { current: 'vieja123', next: 'nueva123', confirm: 'nueva123' };

describe('passwordChangeProblem', () => {
  it('acepta un cambio válido', () => {
    expect(passwordChangeProblem(valid)).toBeNull();
  });

  it.each(['current', 'next', 'confirm'] as const)('pide los tres campos (falta %s)', (field) => {
    expect(passwordChangeProblem({ ...valid, [field]: '' })).toBe('Completá los tres campos.');
  });

  it('exige el mínimo de Supabase, 6 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6);
    expect(passwordChangeProblem({ ...valid, next: '12345', confirm: '12345' })).toBe(
      'La nueva contraseña debe tener al menos 6 caracteres.',
    );
  });

  it('acepta exactamente el mínimo', () => {
    expect(passwordChangeProblem({ ...valid, next: '123456', confirm: '123456' })).toBeNull();
  });

  it('rechaza una nueva igual a la actual', () => {
    expect(passwordChangeProblem({ current: 'misma123', next: 'misma123', confirm: 'misma123' })).toBe(
      'La nueva contraseña tiene que ser distinta de la actual.',
    );
  });

  it('rechaza una confirmación que no coincide', () => {
    expect(passwordChangeProblem({ ...valid, confirm: 'nueva124' })).toBe(
      'La confirmación no coincide con la nueva contraseña.',
    );
  });

  it('no recorta espacios: son caracteres válidos de la contraseña', () => {
    expect(passwordChangeProblem({ ...valid, confirm: 'nueva123 ' })).toBe(
      'La confirmación no coincide con la nueva contraseña.',
    );
  });
});

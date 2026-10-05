/** Mínimo que exige Supabase Auth por defecto; el login usa el mismo al registrar. */
export const MIN_PASSWORD_LENGTH = 6;

type PasswordChange = { current: string; next: string; confirm: string };

/**
 * Qué impide guardar el cambio de contraseña, o `null` si se puede intentar.
 * No recorta espacios: son caracteres válidos de la contraseña.
 */
export function passwordChangeProblem({ current, next, confirm }: PasswordChange): string | null {
  if (!current || !next || !confirm) return 'Completá los tres campos.';
  if (next.length < MIN_PASSWORD_LENGTH) {
    return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (next === current) return 'La nueva contraseña tiene que ser distinta de la actual.';
  if (next !== confirm) return 'La confirmación no coincide con la nueva contraseña.';
  return null;
}

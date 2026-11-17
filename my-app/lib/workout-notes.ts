/**
 * Observaciones de un ejercicio en un día: lo que los números no explican
 * (cambio de máquina, dolor, se acabó el tiempo). Terminan como nota de celda
 * en el Sheet del entrenador, así que alcanza con un par de frases.
 *
 * El mismo tope vive como `check` en `workout_notes`: acá se valida para poder
 * decir el motivo en vez de mostrar el error crudo de Postgres.
 */
export const NOTE_MAX_LENGTH = 500;

export type ParsedNote = { ok: true; note: string | null } | { ok: false; error: string };

/** `note: null` significa «borrar»: guardar el cuadro vacío elimina la nota. */
export function parseNote(raw: string): ParsedNote {
  const note = raw.trim();
  if (note === '') return { ok: true, note: null };
  if (note.length > NOTE_MAX_LENGTH) {
    return { ok: false, error: `La nota no puede pasar de ${NOTE_MAX_LENGTH} caracteres` };
  }
  return { ok: true, note };
}

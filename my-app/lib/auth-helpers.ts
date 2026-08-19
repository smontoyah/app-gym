import { supabase } from './supabase';

/** Lo que ve el usuario cuando la sesión ya no alcanza para escribir. */
export const NO_SESSION = 'Se cerró la sesión. Volvé a iniciar sesión para guardar.';

export type SessionUser = {
  userId: string | null;
  /** `null` si hay sesión; el mensaje listo para mostrar si no. */
  error: string | null;
};

/**
 * Quién está en sesión, o por qué no hay nadie.
 *
 * No lanza a propósito. Antes esto era un `throw` y ninguna pantalla lo
 * atrapaba: con el refresh token caído, Ejercicio se quedaba con el spinner
 * girando para siempre y los formularios con el botón en «Guardando…»,
 * porque el `setLoading(false)` vive después del `await`. El error viaja como
 * dato, igual que el de todas las demás acciones.
 */
export async function currentUserId(): Promise<SessionUser> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { userId: null, error: NO_SESSION };
    return { userId: session.user.id, error: null };
  } catch {
    // Fallo leyendo/refrescando la sesión: para escribir, es lo mismo que no tenerla.
    return { userId: null, error: NO_SESSION };
  }
}

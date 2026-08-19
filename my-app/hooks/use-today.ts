import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from '@/lib/date';

/**
 * «Hoy» según el reloj del teléfono, revisado cada vez que la app vuelve al
 * frente.
 *
 * A propósito NO hay temporizador: si la medianoche pasa con la app abierta y en
 * uso, la fecha no se mueve sola. Partir en dos fechas una sesión que empezó a
 * las 23:40 es justo lo que evita `lib/date.ts`, y quien está entrenando a esa
 * hora sigue en la jornada que arrancó.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = todayStr();
      // Mismo string = mismo día: se devuelve el anterior para no re-renderizar.
      setToday((prev) => (prev === now ? prev : now));
    });
    return () => subscription.remove();
  }, []);

  return today;
}

/**
 * La fecha que se está mirando, anclada a hoy.
 *
 * Android puede tener la app en memoria de un día para el otro: al volver, la
 * pantalla seguía en la fecha de ayer y lo que se registraba caía ahí sin que
 * nada lo dijera. Cuando el día del teléfono cambia, la selección avanza sola
 * —pero sólo si estabas viendo «hoy»: si te habías movido a otra fecha a
 * propósito, se respeta.
 */
export function useAnchoredDate() {
  const today = useToday();
  const [dateStr, setDateStr] = useState(today);
  /** Qué día era «hoy» la última vez que se miró el reloj. */
  const anchorRef = useRef(today);

  useEffect(() => {
    if (anchorRef.current === today) return;
    const previousToday = anchorRef.current;
    anchorRef.current = today;
    setDateStr((current) => (current === previousToday ? today : current));
  }, [today]);

  return { dateStr, setDateStr, today };
}

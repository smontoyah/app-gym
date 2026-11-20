import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { formatClock, markJustReached, REST_PAUSE_MARKS } from '../_lib/rest-pause';

type RestPauseTimerProps = {
  /** Momento del último toque; null = detenido. */
  startedAt: number | null;
  onRestart: () => void;
  onStop: () => void;
};

/**
 * Cronómetro manual para la pausa del rest-pause («12 + pausa 30 s + al
 * fallo»). Cuenta hacia ARRIBA y cada toque lo reinicia en 0, porque la pausa
 * se repite dentro de la misma serie. Vibra al cumplir 15 s y, distinto, 30 s:
 * la nota del ejercicio dice cuál de las dos toca.
 *
 * Va fijo sobre la lista para que se vea en cualquier ejercicio. Como el de
 * descanso, deriva el tiempo de `Date.now()` en cada tick.
 */
export const RestPauseTimer = memo(function RestPauseTimer({
  startedAt,
  onRestart,
  onStop,
}: RestPauseTimerProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [elapsed, setElapsed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (startedAt === null) return;
    prevRef.current = 0;
    setElapsed(0);
    const id = setInterval(() => {
      const now = Math.floor((Date.now() - startedAt) / 1000);
      const mark = markJustReached(prevRef.current, now);
      prevRef.current = now;
      setElapsed(now);
      if (mark === 15) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else if (mark === 30) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const restart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRestart();
  };

  if (startedAt === null) {
    return (
      <TouchableOpacity style={s.container} onPress={restart} activeOpacity={0.7}>
        <Text style={s.idleTitle}>⏱ Pausa rest-pause</Text>
        <Text style={s.hint}>Tocá para contar</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.container, { borderColor: colors.accent }]}>
      <TouchableOpacity style={s.main} onPress={restart} activeOpacity={0.7}>
        <Text style={s.time}>{formatClock(elapsed)}</Text>
        <View style={s.marks}>
          {REST_PAUSE_MARKS.map((m) => {
            const done = elapsed >= m;
            return (
              <View key={m} style={[s.mark, done && { backgroundColor: colors.accent }]}>
                <Text style={[s.markText, done && { color: colors.accentText }]}>{m} s</Text>
              </View>
            );
          })}
        </View>
        <Text style={s.hint}>Tocá para reiniciar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.stopBtn} onPress={onStop}>
        <Text style={s.stopText}>Parar</Text>
      </TouchableOpacity>
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minHeight: 48,
    },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    idleTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
    time: { color: c.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    marks: { flexDirection: 'row', gap: 6 },
    mark: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 6,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    markText: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    hint: { color: c.textMuted, fontSize: 11, flexShrink: 1 },
    stopBtn: { backgroundColor: c.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
    stopText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  });

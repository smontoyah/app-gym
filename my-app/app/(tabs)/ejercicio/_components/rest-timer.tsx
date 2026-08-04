import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

export type RestTarget = {
  /** Momento en que terminó la serie. */
  startedAt: number;
  /** Descanso prescrito en segundos. 0 = super serie, se encadena sin descanso. */
  seconds: number;
  /** Qué toca después. */
  nextLabel: string;
};

function mmss(total: number): string {
  const abs = Math.abs(total);
  return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

type RestTimerProps = {
  target: RestTarget | null;
  onStop: () => void;
};

/**
 * Cuenta REGRESIVA desde el descanso que prescribe el plan.
 * El plan usa seis descansos distintos (0/60/70/90/120s); antes había que
 * acordarse de memoria porque el cronómetro sólo contaba hacia arriba.
 *
 * El tiempo se deriva de `Date.now()` en cada tick, así que si el sistema
 * ralentiza el intervalo con la app en segundo plano el número sigue siendo real.
 */
export const RestTimer = memo(function RestTimer({ target, onStop }: RestTimerProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [elapsed, setElapsed] = useState(0);
  const firedRef = useRef(false);

  const startedAt = target?.startedAt ?? null;

  useEffect(() => {
    if (startedAt === null) return;
    firedRef.current = false;
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const prescribed = target?.seconds ?? 0;
  const remaining = prescribed - elapsed;
  const isOvertime = prescribed > 0 && remaining <= 0;

  // Vibra una sola vez al llegar a cero.
  useEffect(() => {
    if (!isOvertime || firedRef.current) return;
    firedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [isOvertime]);

  if (!target) return null;

  // Super serie: no hay descanso, se encadena con el siguiente ejercicio.
  if (prescribed <= 0) {
    return (
      <View style={[s.container, s.chained]}>
        <View style={s.body}>
          <Text style={s.chainedTitle}>Sin descanso — super serie</Text>
          <Text style={s.nextLabel} numberOfLines={1}>
            Seguí con {target.nextLabel}
          </Text>
        </View>
        <TouchableOpacity style={s.stopBtn} onPress={onStop}>
          <Text style={s.stopText}>Listo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = Math.min(1, Math.max(0, elapsed / prescribed));
  const tone = isOvertime ? colors.danger : colors.accent;

  return (
    <View style={[s.container, { borderColor: tone }]}>
      <View style={s.body}>
        <View style={s.timeRow}>
          <Text style={[s.time, { color: tone }]}>
            {isOvertime ? `+${mmss(remaining)}` : mmss(remaining)}
          </Text>
          <Text style={s.prescribed}>de {prescribed}s</Text>
        </View>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${progress * 100}%`, backgroundColor: tone }]} />
        </View>
        <Text style={s.nextLabel} numberOfLines={1}>
          {isOvertime ? 'Descanso cumplido — ' : 'Después: '}
          {target.nextLabel}
        </Text>
      </View>
      <TouchableOpacity style={[s.stopBtn, isOvertime && { backgroundColor: colors.success }]} onPress={onStop}>
        <Text style={s.stopText}>{isOvertime ? 'Vamos' : 'Parar'}</Text>
      </TouchableOpacity>
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    chained: { borderColor: c.warning, backgroundColor: c.warningBg },
    body: { flex: 1, gap: 4 },
    timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    time: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    prescribed: { color: c.textMuted, fontSize: 12 },
    chainedTitle: { color: c.warning, fontSize: 15, fontWeight: '800' },
    barBg: { height: 4, backgroundColor: c.surfaceSecondary, borderRadius: 2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    nextLabel: { color: c.textSecondary, fontSize: 12 },
    stopBtn: { backgroundColor: c.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
    stopText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  });

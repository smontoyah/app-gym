import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { DAY_NAMES_FULL, formatDuration, formatShort, parseDateStr } from '@/lib/date';
import { Section } from './section';
import { ChipRow, type ChipOption } from './chip-row';
import { formatRpe, formatVolume, plural } from '../_lib/format';
import type { DayStat } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * Cuatro preguntas, una sola gráfica: cuánto levanté, cuánto trabajo hice,
 * cuánto me costó y cuánto tardé. Se dibuja con Views y no con una librería de
 * charts a propósito: cualquiera de ellas trae módulo nativo, y eso rompería
 * las actualizaciones OTA de la app.
 */
type DayMetric = 'volume' | 'sets' | 'rpe' | 'duration';

const METRICS: readonly ChipOption<DayMetric>[] = [
  { key: 'volume', label: 'Volumen' },
  { key: 'sets', label: 'Series' },
  { key: 'rpe', label: 'RPE' },
  { key: 'duration', label: 'Duración' },
];

const METRIC_NAME: Record<DayMetric, string> = {
  volume: 'volumen',
  sets: 'series',
  rpe: 'RPE',
  duration: 'duración',
};

const TRACK_HEIGHT = 92;
/** Con la barra al ras no se distingue un día flojo de un día sin nada. */
const MIN_BAR_HEIGHT = 4;

/**
 * Desde dónde arranca el eje de cada métrica.
 *
 * El volumen, las series y los minutos se leen desde cero, que es su cero de
 * verdad. El RPE no: este plan se mueve entre 7 y 9, y con el eje en cero todas
 * las barras salen de la misma altura y la gráfica deja de decir nada. Cuando el
 * eje no arranca en cero se avisa en la cabecera, que si no es engañar al ojo.
 */
const BASELINE: Record<DayMetric, number> = { volume: 0, sets: 0, rpe: 5, duration: 0 };

function valueOf(day: DayStat, metric: DayMetric): number {
  switch (metric) {
    case 'volume':
      return day.volume;
    case 'sets':
      return day.sets;
    case 'rpe':
      return day.rpe ?? 0;
    case 'duration':
      return day.durationMin ?? 0;
  }
}

function formatMetric(value: number, metric: DayMetric): string {
  switch (metric) {
    case 'volume':
      return formatVolume(value);
    case 'sets':
      return String(value);
    case 'rpe':
      return formatRpe(value || null);
    case 'duration':
      return value > 0 ? formatDuration(value) : '—';
  }
}

/** '16/8' — la etiqueta tiene que caber debajo de una barra de 14 px. */
function barLabel(dateStr: string): string {
  const date = parseDateStr(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function fullDate(dateStr: string): string {
  return `${DAY_NAMES_FULL[parseDateStr(dateStr).getDay()]} ${formatShort(dateStr)}`;
}

type DayChartProps = {
  days: DayStat[];
};

export const DayChart = memo(function DayChart({ days }: DayChartProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [metric, setMetric] = useState<DayMetric>('volume');
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  // Sin selección explícita se muestra el último día. Si al cambiar de rango la
  // fecha elegida ya no está, cae sola en el último: no hace falta resetearla.
  const selected =
    (pickedDate ? days.find((day) => day.date === pickedDate) : undefined) ??
    days[days.length - 1];

  const max = useMemo(
    () => days.reduce((top, day) => Math.max(top, valueOf(day, metric)), 0),
    [days, metric]
  );

  const base = BASELINE[metric];
  const span = max - base;

  const barHeight = (value: number) => {
    const ratio = span > 0 ? Math.max(0, (value - base) / span) : 0;
    return Math.max(MIN_BAR_HEIGHT, Math.round(ratio * TRACK_HEIGHT));
  };

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  if (days.length === 0) return null;

  const hint =
    max > 0
      ? `máx ${formatMetric(max, metric)}${base > 0 ? ` · eje desde ${base}` : ''}`
      : undefined;

  const meta = selected
    ? [
        plural(selected.sets, 'serie', 'series'),
        plural(selected.exercises, 'ejercicio', 'ejercicios'),
        formatVolume(selected.volume),
        selected.rpe !== null ? `RPE ${formatRpe(selected.rpe)}` : null,
        selected.durationMin ? formatDuration(selected.durationMin) : null,
        selected.cardioMinutes ? `${selected.cardioMinutes} min cardio` : null,
      ].filter((part): part is string => part !== null)
    : [];

  return (
    <Section title="Por sesión" hint={hint}>
      <ChipRow options={METRICS} selected={metric} onSelect={setMetric} size="sm" />

      {selected && (
        <View style={s.readout}>
          <Text style={s.readoutDate}>{fullDate(selected.date)}</Text>
          <Text style={s.readoutMeta}>{meta.join(' · ')}</Text>
        </View>
      )}

      {max === 0 ? (
        <Text style={s.empty}>Sin datos de {METRIC_NAME[metric]} en este período.</Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          style={s.barsScroll}
          contentContainerStyle={s.bars}
        >
          {days.map((day) => {
            const value = valueOf(day, metric);
            const active = selected?.date === day.date;
            return (
              <TouchableOpacity
                key={day.date}
                style={s.column}
                onPress={() => setPickedDate(day.date)}
                activeOpacity={0.7}
              >
                <View style={s.track}>
                  <View
                    style={[
                      s.bar,
                      active ? s.barActive : s.barIdle,
                      { height: barHeight(value) },
                    ]}
                  />
                </View>
                <Text style={[s.label, active && s.labelActive]}>{barLabel(day.date)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    readout: { marginTop: 12 },
    readoutDate: { color: c.text, fontSize: 14, fontWeight: '700' },
    readoutMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 17 },
    empty: { color: c.textMuted, fontSize: 12, marginTop: 12 },
    barsScroll: { marginTop: 12 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    column: { width: 28, alignItems: 'center' },
    track: { height: TRACK_HEIGHT, justifyContent: 'flex-end' },
    bar: { width: 14, borderRadius: 4, backgroundColor: c.accent },
    barIdle: { opacity: 0.4 },
    barActive: { opacity: 1 },
    label: { color: c.textMuted, fontSize: 9, marginTop: 5 },
    labelActive: { color: c.accent, fontWeight: '700' },
  });

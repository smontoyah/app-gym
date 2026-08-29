import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { DAY_NAMES_FULL, formatShort, parseDateStr } from '@/lib/date';
import { Section } from '@/components/stats/section';
import { ChipRow, type ChipOption } from '@/components/stats/chip-row';
import { plural, thousands } from '@/lib/stats-format';
import type { NutritionGoals } from '@/types/database';
import type { ChartDay } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * La ingesta día a día contra la meta.
 *
 * Se dibuja con Views y no con una librería de charts, igual que la gráfica de
 * Ejercicio y la de Peso: cualquiera de ellas trae módulo nativo, y eso rompería
 * las actualizaciones OTA de la app.
 *
 * Dos cosas que la gráfica dice y un promedio no: dónde está la línea de meta
 * respecto a la barra de cada día, y dónde hay huecos. Los días sin registro no
 * se saltan —quedan como columna vacía— porque pegar dos días vecinos
 * disimularía el olvido justo cuando importa verlo.
 */
type Metric = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber';

const METRICS: readonly ChipOption<Metric>[] = [
  { key: 'kcal', label: 'Calorías' },
  { key: 'protein', label: 'Proteína' },
  { key: 'carbs', label: 'Carbos' },
  { key: 'fat', label: 'Grasa' },
  { key: 'fiber', label: 'Fibra' },
];

const UNITS: Record<Metric, string> = {
  kcal: 'kcal', protein: 'g', carbs: 'g', fat: 'g', fiber: 'g',
};

const METRIC_NAME: Record<Metric, string> = {
  kcal: 'calorías', protein: 'proteína', carbs: 'carbohidratos', fat: 'grasa', fiber: 'fibra',
};

const GOAL_FIELD: Record<Metric, keyof NutritionGoals> = {
  kcal: 'energy_kcal', protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g', fiber: 'fiber_g',
};

const TRACK_HEIGHT = 96;
/** Alto de la fila de fechas: la línea de meta se cuelga desde arriba de ella. */
const LABEL_SPACE = 18;
/** Con la barra al ras no se distingue un día flojo de uno sin nada. */
const MIN_BAR_HEIGHT = 3;

function valueOf(day: ChartDay, metric: Metric): number {
  if (!day.day) return 0;
  switch (metric) {
    case 'kcal': return day.day.kcal;
    case 'protein': return day.day.protein;
    case 'carbs': return day.day.carbs;
    case 'fat': return day.day.fat;
    case 'fiber': return day.day.fiber;
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

type Props = {
  days: ChartDay[];
  goals: NutritionGoals | null;
  /** Promedio de los días completos, para el pie de la sección. */
  avgKcal: number | null;
};

export const KcalChart = memo(function KcalChart({ days, goals, avgKcal }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [metric, setMetric] = useState<Metric>('kcal');
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  const goal = goals?.[GOAL_FIELD[metric]];
  const goalValue = typeof goal === 'number' ? goal : null;

  // Sin selección explícita se muestra el último día CON registro: el último
  // día del rango puede ser un hueco, y abrir en «sin registro» no dice nada.
  const withData = days.filter((d) => d.day !== null);
  const selected =
    (pickedDate ? days.find((d) => d.date === pickedDate) : undefined) ??
    withData[withData.length - 1];

  // La meta entra en la escala: si quedara por encima del máximo, la línea se
  // saldría del recuadro justo el día que más importa verla.
  const max = useMemo(() => {
    const top = days.reduce((acc, day) => Math.max(acc, valueOf(day, metric)), 0);
    return Math.max(top, goalValue ?? 0);
  }, [days, metric, goalValue]);

  const barHeight = (value: number) => {
    if (value <= 0) return 0;
    const ratio = max > 0 ? value / max : 0;
    return Math.max(MIN_BAR_HEIGHT, Math.round(ratio * TRACK_HEIGHT));
  };

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  if (days.length === 0) return null;

  const unit = UNITS[metric];
  const hintParts: string[] = [];
  if (goalValue !== null) hintParts.push(`meta ${thousands(goalValue)}`);
  if (metric === 'kcal' && avgKcal !== null) hintParts.push(`promedio ${thousands(avgKcal)}`);

  const selectedValue = selected ? valueOf(selected, metric) : 0;

  return (
    <Section title="Día a día" hint={hintParts.join(' · ') || undefined}>
      <ChipRow options={METRICS} selected={metric} onSelect={setMetric} size="sm" />

      {selected && (
        <View style={s.readout}>
          <Text style={s.readoutDate}>{fullDate(selected.date)}</Text>
          {selected.day ? (
            <Text style={s.readoutMeta}>
              <Text style={s.readoutValue}>
                {thousands(selectedValue)} {unit}
              </Text>
              {'  ·  '}
              {plural(selected.day.items, 'alimento', 'alimentos')}
              {selected.day.partial && (
                <Text style={s.readoutWarn}>{'  ·  registro incompleto'}</Text>
              )}
            </Text>
          ) : (
            <Text style={s.readoutEmpty}>Sin registro este día</Text>
          )}
        </View>
      )}

      {max === 0 ? (
        <Text style={s.empty}>Sin datos de {METRIC_NAME[metric]} en este período.</Text>
      ) : (
        <View style={s.plot}>
          {/* La línea de meta va detrás de las barras y no scrollea: es una
              referencia horizontal constante, y moverla con el scroll la haría
              parecer un dato más de la serie. */}
          {goalValue !== null && goalValue > 0 && (
            <View style={[s.goalLine, { bottom: LABEL_SPACE + barHeight(goalValue) }]} />
          )}

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
            contentContainerStyle={s.bars}
          >
            {days.map((day) => {
              const value = valueOf(day, metric);
              const active = selected?.date === day.date;
              const partial = day.day?.partial ?? false;
              return (
                <TouchableOpacity
                  key={day.date}
                  style={s.column}
                  onPress={() => setPickedDate(day.date)}
                  activeOpacity={0.7}
                >
                  <View style={s.track}>
                    {day.day ? (
                      <View
                        style={[
                          s.bar,
                          partial ? s.barPartial : s.barNormal,
                          active && s.barActive,
                          { height: barHeight(value) },
                        ]}
                      />
                    ) : (
                      <View style={s.gap} />
                    )}
                  </View>
                  <Text
                    style={[
                      s.label,
                      !day.day && s.labelEmpty,
                      active && s.labelActive,
                    ]}
                  >
                    {barLabel(day.date)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Text style={s.legend}>
        {goalValue !== null && goalValue > 0 ? 'La línea marca la meta diaria. ' : ''}
        Tocá una columna para ver el día.
      </Text>
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    readout: { marginTop: 12 },
    readoutDate: { color: c.text, fontSize: 14, fontWeight: '700' },
    readoutMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 17 },
    readoutValue: { color: c.text, fontWeight: '700' },
    readoutWarn: { color: c.warning, fontWeight: '600' },
    readoutEmpty: { color: c.textMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
    empty: { color: c.textMuted, fontSize: 12, marginTop: 12 },
    plot: { marginTop: 12, height: TRACK_HEIGHT + LABEL_SPACE, justifyContent: 'flex-end' },
    goalLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: c.text,
      opacity: 0.45,
    },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    column: { width: 26, alignItems: 'center' },
    track: { height: TRACK_HEIGHT, justifyContent: 'flex-end' },
    bar: { width: 13, borderRadius: 3 },
    barNormal: { backgroundColor: c.accent, opacity: 0.55 },
    // El día incompleto no es «poco»: es un dato que no se puede leer. Va en el
    // color de aviso y con el motivo escrito en el readout, no solo en color.
    barPartial: { backgroundColor: c.warning, opacity: 0.85 },
    barActive: { opacity: 1 },
    // `borderDashed` y no `border`: en oscuro `border` (#1a1a1a) es el mismo
    // color que la superficie de la tarjeta y el hueco se volvía invisible,
    // justo el día que hay que notar que falta.
    gap: { height: MIN_BAR_HEIGHT, width: 13, borderRadius: 2, backgroundColor: c.borderDashed },
    label: { color: c.textMuted, fontSize: 9, marginTop: 5, height: LABEL_SPACE - 5 },
    labelEmpty: { opacity: 0.4 },
    labelActive: { color: c.accent, fontWeight: '700' },
    legend: { color: c.textMuted, fontSize: 10, marginTop: 8, lineHeight: 14 },
  });

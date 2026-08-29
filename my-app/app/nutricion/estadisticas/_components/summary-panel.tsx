import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from '@/components/stats/section';
import { absDelta, pctDelta, plural, thousands, type Delta } from '@/lib/stats-format';
import { formatKg, type DayPoint } from '@/lib/nutricion/peso';
import type { NutritionGoals } from '@/types/database';
import type { NutritionSummary } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type Tile = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  delta: Delta | null;
  /**
   * Subir o bajar no es bueno ni malo por sí mismo: la variación se pinta
   * neutra. Vale para el peso —depende de si se busca superávit o déficit— y
   * para las calorías, que la app no sabe si conviene subir o bajar.
   */
  neutral?: boolean;
};

type Props = {
  summary: NutritionSummary;
  goals: NutritionGoals | null;
  weights: DayPoint[];
  periodTitle: string;
  /** Con «Todo» no hay período anterior contra el que comparar. */
  showComparison: boolean;
};

export const SummaryPanel = memo(function SummaryPanel({
  summary,
  goals,
  weights,
  periodTitle,
  showComparison,
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const tiles = useMemo<Tile[]>(() => {
    const { avg, prev } = summary;
    const goalKcal = goals?.energy_kcal ?? null;
    const latest = weights.length > 0 ? weights[weights.length - 1] : null;
    const firstWeight = weights.length > 1 ? weights[0] : null;

    // g/kg es la lectura útil de la proteína: 137 g significa cosas distintas a
    // 60 kg que a 95. Solo se muestra si hay un peso del período.
    const perKg =
      avg.protein !== null && latest ? avg.protein / latest.kg : null;

    const adherence =
      avg.kcal !== null && goalKcal ? Math.round((avg.kcal / goalKcal) * 100) : null;

    return [
      {
        label: 'Promedio diario',
        value: avg.kcal === null ? '—' : thousands(avg.kcal),
        unit: 'kcal',
        note: `${plural(summary.daysComplete, 'día completo', 'días completos')}`,
        delta: showComparison && avg.kcal !== null && prev.kcal !== null
          ? pctDelta(avg.kcal, prev.kcal)
          : null,
        neutral: true,
      },
      {
        label: 'Proteína',
        value: avg.protein === null ? '—' : String(Math.round(avg.protein)),
        unit: 'g',
        note: perKg !== null ? `${perKg.toFixed(2)} g/kg de peso` : undefined,
        delta: showComparison && avg.protein !== null && prev.protein !== null
          ? pctDelta(avg.protein, prev.protein)
          : null,
      },
      {
        label: 'Adherencia',
        value: adherence === null ? '—' : String(adherence),
        unit: adherence === null ? undefined : '%',
        note:
          avg.kcal !== null && goalKcal
            ? `${thousands(avg.kcal - goalKcal)} kcal/día`
            : 'sin meta configurada',
        delta: null,
      },
      {
        label: 'Peso',
        value: latest ? formatKg(latest.kg) : '—',
        unit: latest ? 'kg' : undefined,
        note: latest
          ? `${plural(weights.length, 'medición', 'mediciones')}`
          : 'sin pesajes en el rango',
        delta: firstWeight && latest ? absDelta(latest.kg, firstWeight.kg) : null,
        neutral: true,
      },
    ];
  }, [summary, goals, weights, showComparison]);

  const facts = useMemo(() => {
    const list: string[] = [];
    if (summary.totalLogs > 0) {
      list.push(plural(summary.totalLogs, 'alimento', 'alimentos'));
    }
    if (summary.daysLogged > 0) {
      list.push(`${plural(summary.daysLogged, 'día', 'días')} con registro`);
    }
    if (summary.minKcal !== null && summary.maxKcal !== null && summary.daysComplete > 1) {
      list.push(`${thousands(summary.minKcal)}–${thousands(summary.maxKcal)} kcal`);
    }
    if (summary.sdKcal !== null) {
      list.push(`±${thousands(summary.sdKcal)} kcal de desviación`);
    }
    return list;
  }, [summary]);

  const deltaColor = (delta: Delta, neutral?: boolean) => {
    if (neutral || delta.direction === 'flat') return colors.textMuted;
    return delta.direction === 'up' ? colors.success : colors.danger;
  };

  return (
    <Section title="Resumen" hint={periodTitle}>
      <View style={s.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={s.tile}>
            <Text style={s.tileLabel}>{tile.label}</Text>
            <Text style={s.tileValue}>
              {tile.value}
              {!!tile.unit && <Text style={s.tileUnit}> {tile.unit}</Text>}
            </Text>
            {tile.delta ? (
              <Text style={[s.tileDelta, { color: deltaColor(tile.delta, tile.neutral) }]}>
                {tile.delta.label}
              </Text>
            ) : (
              <Text style={s.tileNote} numberOfLines={1}>
                {tile.note ?? '—'}
              </Text>
            )}
            {tile.delta && !!tile.note && (
              <Text style={s.tileNote} numberOfLines={1}>
                {tile.note}
              </Text>
            )}
          </View>
        ))}
      </View>

      {facts.length > 0 && <Text style={s.facts}>{facts.join(' · ')}</Text>}

      {summary.daysPartial > 0 && (
        <Text style={s.footnote}>
          Los promedios excluyen {plural(summary.daysPartial, 'día', 'días')} con tres alimentos o
          menos: son registros abandonados, no días de ayuno.
        </Text>
      )}
      {showComparison && summary.prev.days > 0 && (
        <Text style={s.footnote}>
          La variación compara con los {summary.prev.days} días registrados del período anterior.
        </Text>
      )}
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: c.surfaceSecondary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    tileLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    tileValue: { color: c.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
    tileUnit: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    tileDelta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    tileNote: { color: c.textMuted, fontSize: 10, marginTop: 2 },
    facts: { color: c.textSecondary, fontSize: 12, marginTop: 12, lineHeight: 17 },
    footnote: { color: c.textMuted, fontSize: 10, marginTop: 6, lineHeight: 14 },
  });

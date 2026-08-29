import { memo, useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from '@/components/stats/section';
import { MacroBar } from '@/components/nutricion/macro-bar';
import { GOAL_LABELS, GOAL_UNITS, type GoalField } from '@/lib/nutricion/diario';
import type { NutritionGoals } from '@/types/database';
import type { MacroAverages } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * El promedio de cada macro contra su meta.
 *
 * Reusa la `MacroBar` del Diario a propósito: es exactamente la misma lectura
 * —consumido contra objetivo— y tenerla dos veces dibujada distinto haría que
 * la misma cifra se viera de dos formas según la pantalla. Lo único que cambia
 * es que acá el número es un promedio del período, y eso lo aclara el pie.
 */
const FIELD_TO_AVG: Record<GoalField, keyof MacroAverages> = {
  energy_kcal: 'kcal',
  protein_g: 'protein',
  carbs_g: 'carbs',
  fat_g: 'fat',
  fiber_g: 'fiber',
};

const ORDER: GoalField[] = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

type Props = {
  avg: MacroAverages;
  goals: NutritionGoals | null;
  daysComplete: number;
};

export const GoalMeters = memo(function GoalMeters({ avg, goals, daysComplete }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Sin ningún día completo no hay promedio que comparar: la sección entera se
  // esconde en vez de mostrar cuatro barras en cero.
  if (daysComplete === 0) return null;

  const rows = ORDER.map((field) => ({
    field,
    consumed: avg[FIELD_TO_AVG[field]],
    goal: goals?.[field] ?? null,
  })).filter((row) => row.consumed !== null);

  if (rows.length === 0) return null;

  const hasAnyGoal = rows.some((row) => row.goal !== null);

  return (
    <Section title="Promedio contra meta" hint={`${daysComplete} días completos`}>
      {rows.map((row) => (
        <MacroBar
          key={row.field}
          label={GOAL_LABELS[row.field]}
          consumed={row.consumed as number}
          goal={row.goal}
          unit={GOAL_UNITS[row.field]}
        />
      ))}

      <Text style={s.footnote}>
        {hasAnyGoal
          ? 'Cada cifra es el promedio diario del período, no un total.'
          : 'Todavía no hay metas configuradas: en Objetivos podés ponerlas y acá aparece la comparación.'}
      </Text>
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    footnote: { color: c.textMuted, fontSize: 10, lineHeight: 14 },
  });

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { NutritionGoals } from '@/types/database';
import { GOAL_FIELDS, GOAL_LABELS, GOAL_UNITS, type DayTotals, type GoalField } from '@/lib/nutricion/diario';
import { formatMacro } from '@/components/nutricion/macro-bar';

type Props = {
  /** Lo que el día ya lleva registrado. */
  totals: DayTotals;
  /** Lo que sumaría la cantidad escrita, todavía sin guardar. */
  added: DayTotals;
  goals: NutritionGoals | null;
  /** Cómo se lee la cantidad simulada: "2 huevos · 100 g". */
  quantityLabel: string;
};

/**
 * Cómo quedaría el día si se agregara lo que está escrito, sin escribir nada en
 * la base.
 *
 * La barra va en dos tramos —lo ya comido y lo que se sumaría— porque la
 * pregunta no es cuánto trae el alimento sino si todavía cabe en el objetivo.
 * El borde punteado es el mismo recurso que usa "+ Agregar" en el diario para
 * marcar lo que aún no existe.
 */
export function ImpactPreview({ totals, added, goals, quantityLabel }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Con objetivo se muestran las metas definidas; sin objetivo no hay contra
  // qué comparar, así que se listan las macros que el alimento realmente trae
  // (las que vengan en cero solo serían renglones vacíos).
  const withGoal = GOAL_FIELDS.filter((f) => goals?.[f] != null);
  const shown: GoalField[] =
    withGoal.length > 0 ? withGoal : GOAL_FIELDS.filter((f) => added[f] > 0);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.title}>Si lo agregás</Text>
        <Text style={s.badge}>sin registrar</Text>
      </View>
      <Text style={s.subtitle}>{quantityLabel} · aporta {formatMacro(added.energy_kcal)} kcal</Text>

      {shown.length === 0 ? (
        <Text style={s.empty}>Este alimento no tiene macros cargadas.</Text>
      ) : (
        shown.map((f) => {
          const before = totals[f];
          const after = before + added[f];
          const goal = goals?.[f] ?? null;
          const over = goal != null && after > goal;
          // Los dos tramos se recortan al objetivo: sin el tope, pasarse lo
          // haría desbordar la tarjeta. El exceso lo dice el color y el texto.
          const beforeW = goal ? Math.min(before / goal, 1) : 0;
          const afterW = goal ? Math.min(after / goal, 1) : 0;
          const unit = GOAL_UNITS[f];

          return (
            <View key={f} style={s.row}>
              <View style={s.rowHead}>
                <Text style={s.label}>{GOAL_LABELS[f]}</Text>
                <Text style={s.delta}>+{formatMacro(added[f])} {unit}</Text>
              </View>

              {goal ? (
                <View style={s.track}>
                  <View style={[s.fill, { width: `${beforeW * 100}%` }]} />
                  <View
                    style={[s.fillAdded, over && s.fillOver, { width: `${(afterW - beforeW) * 100}%` }]}
                  />
                </View>
              ) : null}

              <Text style={[s.detail, over && s.detailOver]}>
                {formatMacro(before)} → {formatMacro(after)}
                {goal ? ` de ${formatMacro(goal)} ${unit}` : ` ${unit}`}
                {goal
                  ? over
                    ? ` · ${formatMacro(after - goal)} ${unit} por encima`
                    : ` · quedarían ${formatMacro(goal - after)} ${unit}`
                  : ''}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borderDashed,
      padding: 14,
      marginTop: 18,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: c.text, fontSize: 14, fontWeight: '700' },
    badge: {
      color: c.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    subtitle: { color: c.textSecondary, fontSize: 12, marginTop: 3, marginBottom: 12 },
    empty: { color: c.textMuted, fontSize: 12 },
    row: { marginBottom: 12 },
    rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
    label: { color: c.textSecondary, fontSize: 13 },
    delta: { color: c.text, fontSize: 14, fontWeight: '700' },
    track: {
      flexDirection: 'row',
      height: 7,
      borderRadius: 4,
      backgroundColor: c.surfaceSecondary,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: c.accent },
    fillAdded: { height: '100%', backgroundColor: c.success },
    fillOver: { backgroundColor: c.warning },
    detail: { color: c.textMuted, fontSize: 11, marginTop: 4 },
    detailOver: { color: c.warning },
  });

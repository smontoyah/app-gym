import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from '@/components/stats/section';
import { MEAL_LABELS } from '@/lib/nutricion/diario';
import { thousands } from '@/lib/stats-format';
import type { MealStat } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * Cuánto aporta cada tiempo de comida.
 *
 * El promedio se divide entre los días en que ESA comida se registró, no entre
 * los días del rango: si la cena se anotó 8 de 10 días, dividir entre 10 la
 * haría parecer más liviana de lo que es. Cuando ese divisor no coincide con el
 * del período se dice al lado, porque es justo la señal de que ahí falta
 * registro.
 */
type Props = {
  meals: MealStat[];
  /** Días con algún registro en el período: el divisor de referencia. */
  daysLogged: number;
};

export const MealSplit = memo(function MealSplit({ meals, daysLogged }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (meals.length === 0) return null;

  // El piso de 1 evita un ancho `NaN%` si por lo que sea todos vienen en cero.
  const max = Math.max(1, ...meals.map((m) => m.kcalPerDay));

  return (
    <Section title="Por tiempo de comida" hint="promedio por día registrado">
      {meals.map((meal) => {
        // Un día suelto sin anotar es normal y no merece un aviso: con el
        // umbral en uno, tres de cuatro comidas salían marcadas y el naranja
        // dejaba de significar nada. Desde dos días la ausencia ya es un patrón.
        const incomplete = daysLogged - meal.days >= 2;
        return (
          <View key={meal.meal} style={s.row}>
            <View style={s.head}>
              <Text style={s.name}>{MEAL_LABELS[meal.meal]}</Text>
              <Text style={s.value}>
                {thousands(meal.kcalPerDay)}
                <Text style={s.unit}> kcal · {Math.round(meal.proteinPerDay)} g P</Text>
              </Text>
            </View>
            <View style={s.track}>
              <View style={[s.bar, { width: `${Math.max(3, (meal.kcalPerDay / max) * 100)}%` }]} />
            </View>
            {incomplete && (
              <Text style={s.missing}>
                registrado {meal.days} de {daysLogged} días
              </Text>
            )}
          </View>
        );
      })}
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { marginBottom: 12 },
    head: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 5,
      gap: 8,
    },
    name: { color: c.text, fontSize: 13 },
    value: { color: c.text, fontSize: 14, fontWeight: '700' },
    unit: { color: c.textMuted, fontSize: 11, fontWeight: '400' },
    track: { height: 8, borderRadius: 4, backgroundColor: c.surfaceSecondary, overflow: 'hidden' },
    bar: { height: 8, borderRadius: 4, backgroundColor: c.accent },
    missing: { color: c.warning, fontSize: 10, marginTop: 4 },
  });

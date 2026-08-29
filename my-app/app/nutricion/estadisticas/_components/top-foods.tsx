import { memo, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from '@/components/stats/section';
import { plural, thousands } from '@/lib/stats-format';
import type { FoodStat } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * Qué alimentos aportan más calorías en el período.
 *
 * Ordenado por calorías APORTADAS y no por veces registrado: lo que mueve el
 * total es el aporte, y ahí es donde aparecen los alimentos que suman mucho con
 * poco gramaje —galletas, aceites, salsas— que por frecuencia se verían como un
 * renglón más.
 */
const COLLAPSED = 5;

type Props = {
  foods: FoodStat[];
};

export const TopFoods = memo(function TopFoods({ foods }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  if (foods.length === 0) return null;

  const max = Math.max(1, ...foods.map((f) => f.kcal));
  const visible = expanded ? foods : foods.slice(0, COLLAPSED);
  const hidden = foods.length - visible.length;

  return (
    <Section title="Alimentos que más aportan" hint={plural(foods.length, 'alimento', 'alimentos')}>
      {visible.map((food) => (
        <View key={food.name} style={s.row}>
          <View style={s.head}>
            <Text style={s.name} numberOfLines={1}>
              {food.name}
            </Text>
            <Text style={s.kcal}>{thousands(food.kcal)}</Text>
          </View>
          <View style={s.trackRow}>
            <View style={s.track}>
              <View style={[s.bar, { width: `${Math.max(3, (food.kcal / max) * 100)}%` }]} />
            </View>
            <Text style={s.meta}>
              {thousands(food.grams)} g · {food.days} d
            </Text>
          </View>
        </View>
      ))}

      <View style={s.footer}>
        <Text style={s.legend}>kcal aportadas en el período</Text>
        {(expanded || hidden > 0) && (
          <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} activeOpacity={0.7}>
            <Text style={s.toggle}>{expanded ? 'Ver menos' : `Ver ${hidden} más`}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { marginBottom: 10 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
    name: { color: c.text, fontSize: 12, flex: 1 },
    kcal: { color: c.text, fontSize: 13, fontWeight: '700' },
    trackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.surfaceSecondary,
      overflow: 'hidden',
    },
    bar: { height: 8, borderRadius: 4, backgroundColor: c.accent },
    meta: { color: c.textMuted, fontSize: 10, width: 78, textAlign: 'right' },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
      gap: 8,
    },
    legend: { color: c.textMuted, fontSize: 10 },
    toggle: { color: c.accent, fontSize: 12, fontWeight: '700' },
  });

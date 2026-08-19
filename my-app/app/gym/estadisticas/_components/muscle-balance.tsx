import { memo, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from './section';
import { formatVolume, plural } from '../_lib/format';
import type { MuscleStat } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

/**
 * El balance se mide en **series**, no en volumen: 6 series de prensa mueven
 * más kilos que 6 de vuelos laterales sin que eso signifique que el tren
 * inferior esté mejor atendido. El volumen va como dato secundario.
 */
const COLLAPSED = 6;

type MuscleBalanceProps = {
  muscles: MuscleStat[];
};

export const MuscleBalance = memo(function MuscleBalance({ muscles }: MuscleBalanceProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  if (muscles.length === 0) return null;

  // El piso de 1 evita un ancho `NaN%` si por lo que sea todos vienen en 0.
  const max = Math.max(1, muscles.reduce((top, muscle) => Math.max(top, muscle.sets), 0));
  const visible = expanded ? muscles : muscles.slice(0, COLLAPSED);
  const hidden = muscles.length - visible.length;

  return (
    <Section title="Balance por grupo" hint={plural(muscles.length, 'grupo', 'grupos')}>
      {visible.map((muscle) => (
        <View key={muscle.group} style={s.row}>
          <Text style={s.name} numberOfLines={1}>
            {muscle.group}
          </Text>
          <View style={s.track}>
            <View style={[s.bar, { width: `${Math.max(4, (muscle.sets / max) * 100)}%` }]} />
          </View>
          <Text style={s.sets}>{muscle.sets}</Text>
        </View>
      ))}

      <View style={s.footer}>
        <Text style={s.legend}>series · el más trabajado arriba</Text>
        {(expanded || hidden > 0) && (
          <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} activeOpacity={0.7}>
            <Text style={s.toggle}>{expanded ? 'Ver menos' : `Ver ${hidden} más`}</Text>
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <Text style={s.volumes}>
          {muscles.map((m) => `${m.group} ${formatVolume(m.volume)}`).join(' · ')}
        </Text>
      )}
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    name: { color: c.text, fontSize: 12, width: 104 },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.surfaceSecondary,
      overflow: 'hidden',
    },
    bar: { height: 8, borderRadius: 4, backgroundColor: c.accent },
    sets: { color: c.textSecondary, fontSize: 12, fontWeight: '700', width: 22, textAlign: 'right' },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      gap: 8,
    },
    legend: { color: c.textMuted, fontSize: 10 },
    toggle: { color: c.accent, fontSize: 12, fontWeight: '700' },
    volumes: { color: c.textMuted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  });

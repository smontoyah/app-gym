import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { thousands } from '@/lib/stats-format';
import type { AppColorScheme } from '@/constants/theme';

type Props = {
  label: string;
  consumed: number;
  goal: number | null;
  unit: string;
};

/**
 * Redondeo y separador de miles. Sin el separador, la misma cifra se leía
 * «1.546» en el resumen de Estadísticas y «1546» acá abajo, en la misma
 * pantalla. Se arma a mano y no con `toLocaleString`: Hermes puede venir sin
 * datos de `Intl` y ahí el separador se cae en silencio.
 */
const round = (n: number) =>
  n >= 1000 ? thousands(n) : n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);

export function MacroBar({ label, consumed, goal, unit }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const ratio = goal && goal > 0 ? consumed / goal : 0;
  const over = ratio > 1;
  // La barra se corta al 100%: sin el tope, pasarse del objetivo la haría
  // desbordar la tarjeta. El exceso se comunica con el color y el texto.
  const width = `${Math.min(ratio, 1) * 100}%` as const;

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>
          {round(consumed)}
          {goal ? <Text style={s.goal}> / {round(goal)} {unit}</Text> : <Text style={s.goal}> {unit}</Text>}
        </Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width }, over && s.fillOver]} />
      </View>
      {goal ? (
        <Text style={[s.remain, over && s.remainOver]}>
          {over
            ? `${round(consumed - goal)} ${unit} por encima`
            : `faltan ${round(goal - consumed)} ${unit}`}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    wrap: { marginBottom: 14 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 5 },
    label: { color: c.textSecondary, fontSize: 13 },
    value: { color: c.text, fontSize: 15, fontWeight: '700' },
    goal: { color: c.textMuted, fontSize: 12, fontWeight: '400' },
    track: { height: 7, borderRadius: 4, backgroundColor: c.surfaceSecondary, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: c.accent },
    fillOver: { backgroundColor: c.warning },
    remain: { color: c.textMuted, fontSize: 11, marginTop: 4 },
    remainOver: { color: c.warning },
  });

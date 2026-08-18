import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

const HEIGHT = 34;
/**
 * Suelo de la barra, alto a propósito (~40 %). Con un suelo de pocos píxeles la
 * sesión más baja del período queda pegada al piso y una caída del 10 % se ve
 * como un desplome; el porcentaje exacto está al lado, la barra sólo da la forma.
 */
const FLOOR = 14;

type SparklineProps = {
  /** De la sesión más antigua a la más reciente. */
  values: number[];
};

/**
 * Escala al mínimo y al máximo del período, no a cero: lo que interesa acá es
 * la *forma* de la progresión, y con un eje que arranca en cero tres sesiones
 * de 57, 60 y 61 kg se ven idénticas. Los valores absolutos están al lado.
 */
export const Sparkline = memo(function Sparkline({ values }: SparklineProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;

  return (
    <View style={s.row}>
      {values.map((value, i) => {
        const ratio = span > 0 ? (value - min) / span : 0.6;
        const last = i === values.length - 1;
        return (
          <View
            key={i}
            style={[
              s.bar,
              last ? s.barLast : s.barIdle,
              { height: FLOOR + Math.round(ratio * (HEIGHT - FLOOR)) },
            ]}
          />
        );
      })}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: HEIGHT },
    bar: { width: 8, borderRadius: 2, backgroundColor: c.accent },
    barIdle: { opacity: 0.35 },
    barLast: { opacity: 1 },
  });

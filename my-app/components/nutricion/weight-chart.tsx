import { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { formatShort, parseDateStr } from '@/lib/date';
import { formatKg, type DayPoint } from '@/lib/nutricion/peso';

/**
 * La evolución del peso, dibujada con Views y sin librería de charts: cualquiera
 * de ellas trae módulo nativo y eso rompería las actualizaciones OTA (la misma
 * razón por la que la gráfica de Ejercicio también está hecha a mano).
 *
 * Dos decisiones de escala, que son las que hacen que esto diga algo:
 *
 * · El eje vertical NO arranca en cero. Con el cero abajo, 73 y 75 kg quedan a
 *   dos píxeles y la línea sale plana siempre. Arranca en el mínimo del período
 *   con un margen, y los dos extremos van rotulados para que no haya ilusión.
 * · El eje horizontal es tiempo real, no la posición del punto en la lista. Si
 *   se dejaron de pesar diez días, ahí queda un tramo largo y liso en vez de un
 *   salto disimulado entre dos puntos vecinos.
 */

const HEIGHT = 130;
const GUTTER = 40;
const LINE = 2.5;
const DOT = 7;
/** El de hoy va más grande: es el punto que se busca primero. */
const DOT_LAST = 11;
/** Con más puntos que esto los círculos se pisan entre sí: queda solo la línea. */
const MAX_DOTS = 45;

type Props = {
  /** Del día más viejo al más reciente. Con menos de dos no se dibuja nada. */
  points: DayPoint[];
};

export const WeightChart = memo(function WeightChart({ points }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const geometry = useMemo(() => {
    if (points.length < 2 || width <= 0) return null;

    const values = points.map((p) => p.kg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    // Sin margen la línea toca los bordes del recuadro y se lee como si se
    // hubiera salido de la gráfica. Medio kilo cuando el período es plano.
    const pad = span > 0 ? span * 0.18 : 0.5;
    const lo = min - pad;
    const hi = max + pad;

    const first = parseDateStr(points[0].date).getTime();
    const last = parseDateStr(points[points.length - 1].date).getTime();
    const elapsed = last - first;

    // Los extremos se meten media bolita hacia adentro: pegados al borde, el
    // primer y el último punto quedan cortados por la mitad (Android recorta al
    // contenedor incluso con overflow visible).
    const inset = DOT_LAST / 2;
    const usable = Math.max(0, width - inset * 2);

    const coords = points.map((p) => ({
      x: inset + ((parseDateStr(p.date).getTime() - first) / elapsed) * usable,
      y: (1 - (p.kg - lo) / (hi - lo)) * HEIGHT,
    }));

    // Un segmento entre cada par de puntos: se posiciona por su punto medio y se
    // rota sobre su propio centro, que es el default y no necesita
    // `transformOrigin`.
    const segments = coords.slice(1).map((to, i) => {
      const from = coords[i];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      return {
        left: (from.x + to.x) / 2 - length / 2,
        top: (from.y + to.y) / 2 - LINE / 2,
        length,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    });

    return {
      coords,
      segments,
      min,
      max,
      minY: (1 - (min - lo) / (hi - lo)) * HEIGHT,
      maxY: (1 - (max - lo) / (hi - lo)) * HEIGHT,
    };
  }, [points, width]);

  if (points.length < 2) return null;

  const showDots = points.length <= MAX_DOTS;

  return (
    <View>
      <View style={s.row}>
        <View style={s.gutter}>
          {geometry && (
            <>
              <Text style={[s.axis, { top: geometry.maxY - 7 }]}>{formatKg(geometry.max)}</Text>
              {/* Una semana sin cambios tiene mínimo y máximo iguales: los dos
                  rótulos caerían en la misma altura, uno encima del otro. */}
              {geometry.max !== geometry.min && (
                <Text style={[s.axis, { top: geometry.minY - 7 }]}>{formatKg(geometry.min)}</Text>
              )}
            </>
          )}
        </View>

        <View style={s.plot} onLayout={onLayout}>
          {geometry && (
            <>
              {/* Las referencias del eje, a la altura de su rótulo. */}
              <View style={[s.grid, { top: geometry.maxY }]} />
              {geometry.max !== geometry.min && <View style={[s.grid, { top: geometry.minY }]} />}

              {geometry.segments.map((seg, i) => (
                <View
                  key={i}
                  style={[
                    s.segment,
                    {
                      left: seg.left,
                      top: seg.top,
                      width: seg.length,
                      transform: [{ rotate: `${seg.angle}deg` }],
                    },
                  ]}
                />
              ))}

              {geometry.coords.map((c, i) => {
                const last = i === geometry.coords.length - 1;
                // El último punto va siempre marcado, aunque el resto no quepa:
                // es «dónde estoy ahora», que es lo primero que se busca.
                if (!showDots && !last) return null;
                const size = last ? DOT_LAST : DOT;
                return (
                  <View
                    key={points[i].date}
                    style={[
                      s.dot,
                      last ? s.dotLast : s.dotIdle,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        left: c.x - size / 2,
                        top: c.y - size / 2,
                      },
                    ]}
                  />
                );
              })}
            </>
          )}
        </View>
      </View>

      <View style={s.dates}>
        <Text style={s.date}>{formatShort(points[0].date)}</Text>
        <Text style={s.date}>{formatShort(points[points.length - 1].date)}</Text>
      </View>
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', height: HEIGHT },
    gutter: { width: GUTTER, height: HEIGHT },
    axis: {
      position: 'absolute',
      right: 8,
      width: GUTTER - 8,
      textAlign: 'right',
      color: c.textMuted,
      fontSize: 10,
    },
    plot: { flex: 1, height: HEIGHT },
    grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    segment: { position: 'absolute', height: LINE, borderRadius: LINE / 2, backgroundColor: c.accent },
    dot: { position: 'absolute', backgroundColor: c.accent },
    dotIdle: { opacity: 0.45 },
    // Anillo del color de la tarjeta: separa la bolita de la línea que llega.
    dotLast: { opacity: 1, borderWidth: 3, borderColor: c.surface },
    dates: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: GUTTER, marginTop: 6 },
    date: { color: c.textMuted, fontSize: 10 },
  });

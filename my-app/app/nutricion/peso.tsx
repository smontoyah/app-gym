import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { formatLong, formatShort, formatTime, isToday } from '@/lib/date';
import { useToday } from '@/hooks/use-today';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { WeightChart } from '@/components/nutricion/weight-chart';
import {
  CHANGE_LABELS,
  MAX_KG,
  MIN_KG,
  RANGE_KEYS,
  RANGE_LABELS,
  addWeight,
  currentStats,
  dailySeries,
  deleteWeight,
  fetchWeights,
  formatDelta,
  formatKg,
  parseKg,
  rangeStart,
  rangeSummary,
  type RangeKey,
  type WeighIn,
} from '@/lib/nutricion/peso';

/** Un renglón del historial con su diferencia contra el pesaje anterior. */
type Row = { log: WeighIn; delta: number | null };

export default function PesoScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const keyboardHeight = useKeyboardHeight();
  const today = useToday();

  const [logs, setLogs] = useState<WeighIn[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchWeights();
    setLogs(res.logs);
    setError(res.error);
    setLoading(false);
  }, []);

  // Se recarga al volver a la pestaña, pero sin marcar «cargando»: lo que ya
  // está en pantalla sigue siendo cierto mientras llega la respuesta.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const series = useMemo(() => dailySeries(logs), [logs]);
  const from = useMemo(() => rangeStart(range, today), [range, today]);

  const points = useMemo(
    () => (from ? series.filter((p) => p.date >= from) : series),
    [series, from]
  );

  const current = useMemo(() => currentStats(logs, series), [logs, series]);
  const summary = useMemo(() => rangeSummary(points), [points]);

  /**
   * El historial va del más nuevo al más viejo, y la diferencia de cada renglón
   * se calcula contra el pesaje anterior REAL —aunque quede fuera del rango que
   * se está mirando—, para que el primero de la lista no aparezca sin variación
   * solo porque su vecino se quedó del otro lado del corte.
   */
  const history = useMemo(() => {
    const rows: Row[] = [];
    for (let i = logs.length - 1; i >= 0; i--) {
      if (from && logs[i].date < from) break;
      rows.push({
        log: logs[i],
        delta: i > 0 ? logs[i].weight_kg - logs[i - 1].weight_kg : null,
      });
    }
    return rows;
  }, [logs, from]);

  const handleSave = async () => {
    const kg = parseKg(input);
    if (kg === null) {
      Alert.alert('Falta el peso', 'Escribí cuánto pesás, por ejemplo 74.3.');
      return;
    }
    if (kg < MIN_KG || kg > MAX_KG) {
      Alert.alert('Revisá el número', `El peso tiene que estar entre ${MIN_KG} y ${MAX_KG} kg.`);
      return;
    }

    setSaving(true);
    const res = await addWeight(kg);
    setSaving(false);

    if (res.error) {
      Alert.alert('No se pudo guardar', res.error);
      return;
    }
    setInput('');
    Keyboard.dismiss();
    load();
  };

  const confirmDelete = (log: WeighIn) =>
    Alert.alert(
      'Quitar pesaje',
      `¿Quitar los ${formatKg(log.weight_kg)} kg del ${formatShort(log.date)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteWeight(log.id);
            if (res.error) Alert.alert('Aviso', res.error);
            else load();
          },
        },
      ]
    );

  // El «entre X e Y» solo dice algo con dos valores distintos: con uno solo
  // quedaría «entre 75.0 y 75.0», y sin ninguno mentiría.
  const rangeNote =
    summary.min === null || summary.max === null
      ? 'sin pesajes en el período'
      : summary.min === summary.max
        ? 'un solo valor'
        : `entre ${formatKg(summary.min)} y ${formatKg(summary.max)}`;

  const emptyChart =
    logs.length === 0
      ? 'Anotá tu primer pesaje y acá va a aparecer la curva.'
      : points.length === 1
        ? 'Con un solo día todavía no hay curva. Volvé a pesarte mañana.'
        : 'Sin pesajes en este período. Probá con un rango más amplio.';

  const header = (
    <View>
      {error !== null && (
        <TouchableOpacity style={s.errorBox} onPress={load} activeOpacity={0.8}>
          <Text style={s.errorText}>{error}</Text>
          <Text style={s.errorHint}>Tocá para reintentar</Text>
        </TouchableOpacity>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>Anotar pesaje</Text>
        <View style={s.inputRow}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder="74.3"
              placeholderTextColor={colors.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text style={s.suffix}>kg</Text>
          </View>
          <TouchableOpacity
            style={[s.primary, saving && s.disabled]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={s.primaryText}>{saving ? 'Guardando…' : 'Anotar'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>
          Queda con la fecha y la hora del momento. Pesate siempre en las mismas
          condiciones —al levantarte, antes de desayunar— o comparar días no dice nada.
        </Text>
      </View>

      {current.latest && (
        <View style={s.card}>
          <View style={s.nowRow}>
            <Text style={s.nowKg}>
              {formatKg(current.latest.weight_kg)}
              <Text style={s.nowUnit}> kg</Text>
            </Text>
            {current.vsPrevious !== null && (
              <Text style={s.nowDelta}>{formatDelta(current.vsPrevious)} kg vs. el anterior</Text>
            )}
          </View>
          <Text style={s.nowWhen}>
            {isToday(current.latest.date) ? 'Hoy' : formatLong(current.latest.date)}
            {' · '}
            {formatTime(current.latest.measured_at)}
          </Text>

          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statLabel}>Tendencia 7 d</Text>
              <Text style={s.statValue}>
                {current.trend !== null ? `${formatKg(current.trend)} kg` : '—'}
              </Text>
              <Text style={s.statNote}>
                {current.trendChange !== null
                  ? `${formatDelta(current.trendChange)} kg vs. semana previa`
                  : 'sin semana previa'}
              </Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>{CHANGE_LABELS[range]}</Text>
              <Text style={s.statValue}>
                {summary.change !== null ? `${formatDelta(summary.change)} kg` : '—'}
              </Text>
              <Text style={s.statNote}>{rangeNote}</Text>
            </View>
          </View>

          <Text style={s.footnote}>
            La tendencia de 7 días es el promedio de esa semana, y es lo que hay que
            mirar: entre dos días sueltos el agua y la sal mueven más de medio kilo.
          </Text>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>Evolución</Text>

        <View style={s.chips}>
          {RANGE_KEYS.map((key) => {
            const active = key === range;
            return (
              <TouchableOpacity
                key={key}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setRange(key)}
                activeOpacity={0.7}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{RANGE_LABELS[key]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {points.length < 2 ? (
          <Text style={s.chartEmpty}>{emptyChart}</Text>
        ) : (
          <WeightChart points={points} />
        )}
      </View>

      {history.length > 0 && (
        <View style={s.listHead}>
          <Text style={s.listTitle}>Historial</Text>
          <Text style={s.listHint}>Mantené pulsado para quitar</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={[s.content, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
      data={history}
      keyExtractor={(row) => row.log.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <TouchableOpacity style={s.row} onLongPress={() => confirmDelete(item.log)}>
          <View style={s.rowInfo}>
            <Text style={s.rowDate}>
              {isToday(item.log.date) ? 'Hoy' : formatShort(item.log.date)}
            </Text>
            <Text style={s.rowTime}>{formatTime(item.log.measured_at)}</Text>
          </View>
          {item.delta !== null && <Text style={s.rowDelta}>{formatDelta(item.delta)}</Text>}
          <Text style={s.rowKg}>{formatKg(item.log.weight_kg)} kg</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

    errorBox: { backgroundColor: c.warningBg, borderRadius: 12, padding: 14, marginBottom: 12 },
    errorText: { color: c.warning, fontSize: 13, fontWeight: '600' },
    errorHint: { color: c.textMuted, fontSize: 11, marginTop: 4 },

    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    cardTitle: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      marginBottom: 12,
    },

    inputRow: { flexDirection: 'row', gap: 10 },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    input: { flex: 1, color: c.text, fontSize: 20, fontWeight: '700', paddingVertical: 9 },
    suffix: { color: c.textMuted, fontSize: 14, marginLeft: 6 },
    primary: {
      backgroundColor: c.accent,
      borderRadius: 8,
      paddingHorizontal: 18,
      justifyContent: 'center',
    },
    primaryText: { color: c.accentText, fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.45 },
    hint: { color: c.textMuted, fontSize: 11, lineHeight: 16, marginTop: 10 },

    nowRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    nowKg: { color: c.text, fontSize: 34, fontWeight: '800' },
    nowUnit: { color: c.textSecondary, fontSize: 16, fontWeight: '600' },
    nowDelta: { color: c.textSecondary, fontSize: 12 },
    nowWhen: { color: c.textMuted, fontSize: 12, marginTop: 2 },

    stats: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    stat: { flex: 1 },
    statLabel: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    statValue: { color: c.text, fontSize: 17, fontWeight: '700', marginTop: 3 },
    statNote: { color: c.textMuted, fontSize: 10, marginTop: 2, lineHeight: 14 },
    footnote: { color: c.textMuted, fontSize: 11, lineHeight: 16, marginTop: 14 },

    chips: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: c.accentText },
    chartEmpty: { color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 12 },

    listHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 8,
      marginTop: 2,
    },
    listTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
    listHint: { color: c.textMuted, fontSize: 11 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    rowInfo: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    rowDate: { color: c.text, fontSize: 14, fontWeight: '600' },
    rowTime: { color: c.textMuted, fontSize: 11 },
    rowDelta: { color: c.textSecondary, fontSize: 12, marginRight: 10 },
    rowKg: { color: c.text, fontSize: 15, fontWeight: '700' },
  });

import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { addDays, startOfMonthStr, todayStr } from '@/lib/date';
import { exportRangeToCsv } from '../_lib/export';
import type { AppColorScheme } from '@/constants/theme';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Preset = { label: string; from: () => string; to: () => string };

const PRESETS: Preset[] = [
  { label: 'Últimos 30 días', from: () => addDays(todayStr(), -30), to: todayStr },
  { label: 'Últimos 90 días', from: () => addDays(todayStr(), -90), to: todayStr },
  { label: 'Este mes', from: startOfMonthStr, to: todayStr },
  { label: 'Todo', from: () => '1900-01-01', to: () => '2999-12-31' },
];

type ExportModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [from, setFrom] = useState(() => addDays(todayStr(), -30));
  const [to, setTo] = useState(todayStr);
  const [busy, setBusy] = useState(false);

  const valid = DATE_PATTERN.test(from) && DATE_PATTERN.test(to) && from <= to;

  const handleExport = async () => {
    setBusy(true);
    const { rowCount, error } = await exportRangeToCsv(from, to);
    setBusy(false);

    if (error) {
      Alert.alert('Exportar', error);
      return;
    }
    onClose();
    Alert.alert('Exportado', `${rowCount} registros exportados.`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>Exportar datos</Text>
          <Text style={s.subtitle}>
            CSV con todas las series y sesiones de cardio del rango, incluyendo lo prescrito
            (reps objetivo, descanso, cadencia) junto a lo ejecutado, y la hora de inicio, fin
            y duración de cada jornada.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.presetRow}>
            <View style={s.presetContent}>
              {PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={s.presetChip}
                  onPress={() => {
                    setFrom(preset.from());
                    setTo(preset.to());
                  }}
                >
                  <Text style={s.presetText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={s.fields}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Desde</Text>
              <TextInput
                style={s.input}
                value={from}
                onChangeText={setFrom}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Hasta</Text>
              <TextInput
                style={s.input}
                value={to}
                onChangeText={setTo}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
            </View>
          </View>

          {!valid && <Text style={s.warning}>Usá el formato AAAA-MM-DD y que «desde» no sea posterior a «hasta».</Text>}

          <TouchableOpacity
            style={[s.primaryBtn, (!valid || busy) && s.primaryBtnDisabled]}
            onPress={handleExport}
            disabled={!valid || busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={s.primaryText}>Generar CSV y compartir</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={busy}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: c.surface, borderRadius: 16, padding: 20 },
    title: { color: c.text, fontSize: 18, fontWeight: '800' },
    subtitle: { color: c.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
    presetRow: { marginTop: 16, flexGrow: 0 },
    presetContent: { flexDirection: 'row', gap: 8 },
    presetChip: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    presetText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    fields: { flexDirection: 'row', gap: 12, marginTop: 16 },
    field: { flex: 1 },
    fieldLabel: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
    input: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 8,
      color: c.text,
      fontSize: 15,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    warning: { color: c.warning, fontSize: 12, marginTop: 10 },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 18,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryText: { color: c.accentText, fontSize: 15, fontWeight: '700' },
    cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    cancelText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
  });

import { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { CardioEntry } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type CardioCardProps = {
  cardio: CardioEntry;
  onSave: (minutes: string, modality: string | null) => void;
};

/**
 * El protocolo prescribe ~140 min/semana de LISS (10 min los días 1-5,
 * 45 min los días 6-7). Sin esto la mitad del plan quedaba fuera de la app.
 */
export const CardioCard = memo(function CardioCard({ cardio, onSave }: CardioCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const logged = cardio.log?.minutes ?? null;
  const target = cardio.plan?.target_minutes ?? null;
  const [minutes, setMinutes] = useState(logged !== null ? String(logged) : '');

  // Al cambiar de día hay que re-sincronizar el input con lo registrado.
  useEffect(() => {
    setMinutes(logged !== null ? String(logged) : '');
  }, [logged, cardio.plan?.id]);

  if (!cardio.plan && logged === null) return null;

  const met = logged !== null && target !== null && logged >= target;
  const dirty = minutes !== (logged !== null ? String(logged) : '');

  return (
    <View style={[s.card, met && s.cardDone]}>
      <View style={s.header}>
        <Text style={s.title}>Cardio LISS</Text>
        {target !== null && (
          <View style={s.chip}>
            <Text style={s.chipText}>objetivo {target} min</Text>
          </View>
        )}
      </View>

      {cardio.plan?.modality && <Text style={s.modality}>{cardio.plan.modality}</Text>}

      <View style={s.row}>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          placeholder={target !== null ? String(target) : '0'}
          placeholderTextColor={colors.placeholder}
          value={minutes}
          onChangeText={setMinutes}
        />
        <Text style={s.unit}>min</Text>
        <TouchableOpacity
          style={[s.saveBtn, !dirty && s.saveBtnIdle]}
          onPress={() => onSave(minutes, cardio.plan?.modality ?? null)}
          disabled={!dirty || minutes === ''}
        >
          <Text style={[s.saveText, !dirty && s.saveTextIdle]}>
            {logged !== null && !dirty ? '✓ Registrado' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
    },
    cardDone: { borderLeftColor: c.success },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: c.text, fontSize: 16, fontWeight: '700' },
    chip: { backgroundColor: c.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    modality: { color: c.textSecondary, fontSize: 12, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    input: {
      width: 80,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 8,
      color: c.text,
      fontSize: 16,
      textAlign: 'center',
      paddingVertical: 10,
    },
    unit: { color: c.textSecondary, fontSize: 14 },
    saveBtn: {
      flex: 1,
      backgroundColor: c.accent,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    saveBtnIdle: { backgroundColor: c.surfaceSecondary },
    saveText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
    saveTextIdle: { color: c.textSecondary },
  });

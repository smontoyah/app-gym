import { memo, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, labelWeight, parseWeight, toKg, type WeightUnit } from '@/lib/units';
import type { SetInput, SetLog } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

export type SetField = 'reps' | 'weight' | 'rpe';

type SetRowProps = {
  set: SetLog;
  setIndex: number;
  exerciseId: string;
  /** Unidad en la que está escrito el peso de esta fila. */
  unit: WeightUnit;
  /** Repeticiones objetivo del plan, como placeholder. */
  targetReps: string | null;
  /** RPE objetivo de la fase, como placeholder. */
  targetRpe: string | null;
  onValueChange: (exerciseId: string, setIndex: number, field: SetField, value: string) => void;
  onSave: (exerciseId: string, set: SetInput, unit: WeightUnit) => void;
};

export const SetRow = memo(function SetRow({
  set,
  setIndex,
  exerciseId,
  unit,
  targetReps,
  targetRpe,
  onValueChange,
  onSave,
}: SetRowProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Una sola línea de apoyo por serie. En lb se abre con el kg que va a quedar
  // guardado: es la unidad de todo lo demás, así que conviene tenerlo a la vista
  // y no de fe. La referencia de la sesión previa se dice en la unidad de
  // captura, que es la única comparación útil frente a la máquina.
  const hint = useMemo(() => {
    const parts: string[] = [];

    if (unit === 'lb') {
      const entered = parseWeight(set.weight);
      if (entered !== null) parts.push(`= ${formatWeight(toKg(entered, 'lb'))} kg`);
    }

    if (set.previous && !set.saved) {
      const { weightKg, reps, rpe } = set.previous;
      const rpeLabel = rpe !== null ? ` @ RPE ${rpe}` : '';
      parts.push(`anterior ${labelWeight(weightKg, unit)} × ${reps}${rpeLabel}`);
    }

    return parts.join(' · ');
  }, [unit, set.weight, set.previous, set.saved]);

  return (
    <>
      <View style={s.row}>
        <Text style={s.setNumber}>{set.set_number}</Text>
        <TextInput
          style={[s.input, set.saved && s.inputSaved]}
          keyboardType="numeric"
          placeholder={targetReps ?? '0'}
          placeholderTextColor={colors.placeholder}
          value={set.reps}
          onChangeText={(v) => onValueChange(exerciseId, setIndex, 'reps', v)}
        />
        <TextInput
          style={[s.input, set.saved && s.inputSaved]}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          value={set.weight}
          onChangeText={(v) => onValueChange(exerciseId, setIndex, 'weight', v)}
        />
        <TextInput
          style={[s.input, s.rpeInput, set.saved && s.inputSaved]}
          keyboardType="numeric"
          placeholder={targetRpe ?? 'RPE'}
          placeholderTextColor={colors.placeholder}
          value={set.rpe}
          onChangeText={(v) => onValueChange(exerciseId, setIndex, 'rpe', v)}
        />
        <TouchableOpacity
          style={[s.saveBtn, set.saved && s.saveBtnDone]}
          onPress={() =>
            onSave(
              exerciseId,
              { setNumber: set.set_number, reps: set.reps, weight: set.weight, rpe: set.rpe },
              unit
            )
          }
        >
          <Text style={s.saveBtnText}>{set.saved ? '✓' : '→'}</Text>
        </TouchableOpacity>
      </View>
      {hint !== '' && <Text style={s.hint}>{hint}</Text>}
    </>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    setNumber: { width: 18, color: c.textSecondary, fontSize: 15, textAlign: 'center' },
    input: {
      flex: 1,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 8,
      color: c.text,
      fontSize: 16,
      textAlign: 'center',
      paddingVertical: 10,
      paddingHorizontal: 2,
    },
    rpeInput: { flex: 0.8 },
    inputSaved: { backgroundColor: c.successBg },
    saveBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveBtnDone: { backgroundColor: c.success },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    hint: { color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: -4, marginBottom: 6 },
  });

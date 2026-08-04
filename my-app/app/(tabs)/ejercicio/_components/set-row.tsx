import { memo, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { SetLog } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

export type SetField = 'reps' | 'weight' | 'rpe';

type SetRowProps = {
  set: SetLog;
  setIndex: number;
  exerciseId: string;
  /** Repeticiones objetivo del plan, como placeholder. */
  targetReps: string | null;
  /** RPE objetivo de la fase, como placeholder. */
  targetRpe: string | null;
  onValueChange: (exerciseId: string, setIndex: number, field: SetField, value: string) => void;
  onSave: (exerciseId: string, setNumber: number, reps: string, weight: string, rpe: string) => void;
};

export const SetRow = memo(function SetRow({
  set,
  setIndex,
  exerciseId,
  targetReps,
  targetRpe,
  onValueChange,
  onSave,
}: SetRowProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

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
          onPress={() => onSave(exerciseId, set.set_number, set.reps, set.weight, set.rpe)}
        >
          <Text style={s.saveBtnText}>{set.saved ? '✓' : '→'}</Text>
        </TouchableOpacity>
      </View>
      {set.previousWeight && !set.saved && (
        <Text style={s.previousLabel}>
          anterior: {set.previousWeight}kg × {set.previousReps ?? '?'}
          {set.previousRpe ? ` @ RPE ${set.previousRpe}` : ''}
        </Text>
      )}
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
    previousLabel: { color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: -4, marginBottom: 6 },
  });

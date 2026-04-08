import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { SetLog } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type SetRowProps = {
  set: SetLog;
  setIndex: number;
  exerciseIndex: number;
  exerciseId: string;
  onValueChange: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => void;
  onSave: (exerciseId: string, setNumber: number, reps: string, weight: string) => void;
};

export function SetRow({ set, setIndex, exerciseIndex, exerciseId, onValueChange, onSave }: SetRowProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  return (
    <View style={s.row}>
      <Text style={s.setNumber}>{set.set_number}</Text>
      <TextInput
        style={[s.input, set.saved && s.inputSaved]}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        value={set.reps}
        onChangeText={(v) => onValueChange(exerciseIndex, setIndex, 'reps', v)}
      />
      <TextInput
        style={[s.input, set.saved && s.inputSaved]}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        value={set.weight}
        onChangeText={(v) => onValueChange(exerciseIndex, setIndex, 'weight', v)}
      />
      <TouchableOpacity
        style={[s.saveBtn, set.saved && s.saveBtnDone]}
        onPress={() => onSave(exerciseId, set.set_number, set.reps, set.weight)}>
        <Text style={s.saveBtnText}>{set.saved ? '✓' : '→'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    setNumber: { flex: 1, color: c.textSecondary, fontSize: 16, textAlign: 'center' },
    input: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 8, color: c.text, fontSize: 16, textAlign: 'center', paddingVertical: 10 },
    inputSaved: { backgroundColor: c.successBg },
    saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center' },
    saveBtnDone: { backgroundColor: c.success },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });

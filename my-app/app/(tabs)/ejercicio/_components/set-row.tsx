import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { SetLog } from '../_lib/types';

type SetRowProps = {
  set: SetLog;
  setIndex: number;
  exerciseIndex: number;
  exerciseId: string;
  onValueChange: (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) => void;
  onSave: (
    exerciseId: string,
    setNumber: number,
    reps: string,
    weight: string
  ) => void;
};

export function SetRow({
  set,
  setIndex,
  exerciseIndex,
  exerciseId,
  onValueChange,
  onSave,
}: SetRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.setNumber}>{set.set_number}</Text>
      <TextInput
        style={[styles.input, set.saved && styles.inputSaved]}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#999"
        value={set.reps}
        onChangeText={(v) => onValueChange(exerciseIndex, setIndex, 'reps', v)}
      />
      <TextInput
        style={[styles.input, set.saved && styles.inputSaved]}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#999"
        value={set.weight}
        onChangeText={(v) => onValueChange(exerciseIndex, setIndex, 'weight', v)}
      />
      <TouchableOpacity
        style={[styles.saveBtn, set.saved && styles.saveBtnDone]}
        onPress={() => onSave(exerciseId, set.set_number, set.reps, set.weight)}>
        <Text style={styles.saveBtnText}>{set.saved ? '✓' : '→'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  setNumber: { flex: 1, color: '#888', fontSize: 16, textAlign: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputSaved: { backgroundColor: '#1a2a1a' },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: '#2a6a2a' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

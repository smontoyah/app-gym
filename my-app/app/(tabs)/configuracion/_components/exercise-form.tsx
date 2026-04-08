import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseFormProps = {
  visible: boolean;
  onToggle: () => void;
  onSubmit: (name: string, muscleGroup: string) => void;
};

export function ExerciseForm({ visible, onToggle, onSubmit }: ExerciseFormProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, muscle);
    setName('');
    setMuscle('');
  };

  if (!visible) {
    return (
      <TouchableOpacity style={s.toggleBtn} onPress={onToggle}>
        <Text style={s.toggleText}>+ Crear nuevo ejercicio</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.form}>
      <TextInput style={s.input} placeholder="Nombre del ejercicio" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={s.input} placeholder="Grupo muscular (ej: Pecho, Espalda)" placeholderTextColor={colors.textMuted} value={muscle} onChangeText={setMuscle} />
      <View style={s.buttons}>
        <TouchableOpacity style={s.cancelBtn} onPress={onToggle}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.createBtn} onPress={handleSubmit}>
          <Text style={s.createText}>Crear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    toggleBtn: { borderWidth: 1, borderColor: c.borderDashed, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    toggleText: { color: c.accent, fontSize: 15, fontWeight: '600' },
    form: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginTop: 8 },
    input: { backgroundColor: c.surfaceSecondary, borderRadius: 8, color: c.text, fontSize: 15, padding: 12, marginBottom: 10 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: c.surfaceSecondary, alignItems: 'center' },
    cancelText: { color: c.textSecondary, fontWeight: '600' },
    createBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center' },
    createText: { color: c.accentText, fontWeight: '600' },
  });

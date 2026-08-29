import { useState, useMemo, memo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { MUSCLE_GROUPS } from '@/lib/muscle-groups';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseFormProps = {
  visible: boolean;
  onToggle: () => void;
  onSubmit: (name: string, muscleGroup: string) => void;
  onInputFocus?: () => void;
};

export const ExerciseForm = memo(function ExerciseForm({ visible, onToggle, onSubmit, onInputFocus }: ExerciseFormProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!muscle.trim()) return MUSCLE_GROUPS;
    const q = muscle.toLowerCase();
    return MUSCLE_GROUPS.filter((g) => g.toLowerCase().includes(q));
  }, [muscle]);

  const handleMuscleChange = (text: string) => {
    setMuscle(text);
    setDropdownOpen(true);
  };

  const handleSelectMuscle = (group: string) => {
    setMuscle(group);
    setDropdownOpen(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, muscle);
    setName('');
    setMuscle('');
    setDropdownOpen(false);
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
      <TextInput style={s.input} placeholder="Nombre del ejercicio" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} onFocus={onInputFocus} />
      <View>
        <TextInput
          style={s.input}
          placeholder="Grupo muscular"
          placeholderTextColor={colors.textMuted}
          value={muscle}
          onChangeText={handleMuscleChange}
          onFocus={() => { setDropdownOpen(true); onInputFocus?.(); }}
        />
        {dropdownOpen && filtered.length > 0 && (
          <ScrollView style={s.dropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.map((group) => (
              <TouchableOpacity key={group} style={s.dropdownItem} onPress={() => handleSelectMuscle(group)}>
                <Text style={s.dropdownText}>{group}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
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
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    toggleBtn: { borderWidth: 1, borderColor: c.borderDashed, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    toggleText: { color: c.accent, fontSize: 15, fontWeight: '600' },
    form: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginTop: 8 },
    input: { backgroundColor: c.surfaceSecondary, borderRadius: 8, color: c.text, fontSize: 15, padding: 12, marginBottom: 10 },
    dropdown: { maxHeight: 150, backgroundColor: c.surfaceSecondary, borderRadius: 8, marginTop: -6, marginBottom: 10 },
    dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    dropdownText: { color: c.text, fontSize: 15 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: c.surfaceSecondary, alignItems: 'center' },
    cancelText: { color: c.textSecondary, fontWeight: '600' },
    createBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center' },
    createText: { color: c.accentText, fontWeight: '600' },
  });

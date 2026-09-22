import { useState, useMemo, memo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { CARDIO_GROUP, EXERCISE_CATEGORIES } from '@/lib/muscle-groups';
import { TRACKING_HINTS, TRACKING_LABELS, TRACKING_MODES } from '@/lib/tracking-mode';
import type { TrackingMode } from '@/types/database';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseFormProps = {
  visible: boolean;
  onToggle: () => void;
  onSubmit: (name: string, muscleGroup: string, mode: TrackingMode) => void;
  onInputFocus?: () => void;
};

export const ExerciseForm = memo(function ExerciseForm({ visible, onToggle, onSubmit, onInputFocus }: ExerciseFormProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mode, setMode] = useState<TrackingMode>('carga');

  const filtered = useMemo(() => {
    if (!muscle.trim()) return EXERCISE_CATEGORIES;
    const q = muscle.toLowerCase();
    return EXERCISE_CATEGORIES.filter((g) => g.toLowerCase().includes(q));
  }, [muscle]);

  const handleMuscleChange = (text: string) => {
    setMuscle(text);
    setDropdownOpen(true);
  };

  const handleSelectMuscle = (group: string) => {
    setMuscle(group);
    setDropdownOpen(false);
    // Elegir cardio preselecciona tiempo, que es lo que uno va a querer nueve
    // de cada diez veces. Sigue siendo un preset, no una regla: un cardio a
    // repeticiones (burpees) se cambia con un toque.
    if (group === CARDIO_GROUP) setMode('tiempo');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, muscle, mode);
    setName('');
    setMuscle('');
    setMode('carga');
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
          placeholder="Grupo muscular o Cardio"
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
      <Text style={s.modeLabel}>Cómo se mide</Text>
      <View style={s.modes}>
        {TRACKING_MODES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.mode, mode === m && s.modeOn]}
            onPress={() => setMode(m)}
          >
            <Text style={[s.modeText, mode === m && s.modeTextOn]}>{TRACKING_LABELS[m]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.modeHint}>{TRACKING_HINTS[mode]}</Text>

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
    modeLabel: { color: c.textSecondary, fontSize: 13, marginBottom: 7 },
    modes: { flexDirection: 'row', gap: 8 },
    mode: {
      flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary,
    },
    modeOn: { backgroundColor: c.accent, borderColor: c.accent },
    modeText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    modeTextOn: { color: c.accentText },
    modeHint: { color: c.textMuted, fontSize: 11, marginTop: 6, marginBottom: 10 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: c.surfaceSecondary, alignItems: 'center' },
    cancelText: { color: c.textSecondary, fontWeight: '600' },
    createBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center' },
    createText: { color: c.accentText, fontWeight: '600' },
  });

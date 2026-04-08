import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

type ExerciseFormProps = {
  visible: boolean;
  onToggle: () => void;
  onSubmit: (name: string, muscleGroup: string) => void;
};

export function ExerciseForm({ visible, onToggle, onSubmit }: ExerciseFormProps) {
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
      <TouchableOpacity style={styles.toggleBtn} onPress={onToggle}>
        <Text style={styles.toggleText}>+ Crear nuevo ejercicio</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder="Nombre del ejercicio"
        placeholderTextColor="#666"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Grupo muscular (ej: Pecho, Espalda)"
        placeholderTextColor="#666"
        value={muscle}
        onChangeText={setMuscle}
      />
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onToggle}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createBtn} onPress={handleSubmit}>
          <Text style={styles.createText}>Crear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  toggleText: { color: '#0a7ea4', fontSize: 15, fontWeight: '600' },
  form: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    padding: 12,
    marginBottom: 10,
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  cancelText: { color: '#888', fontWeight: '600' },
  createBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
  },
  createText: { color: '#fff', fontWeight: '600' },
});

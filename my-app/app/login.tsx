import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { AppColorScheme } from '@/constants/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    if (isRegister && password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      setLoading(false);
      if (error) {
        Alert.alert('Error', error.message);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      setLoading(false);
      if (error) {
        Alert.alert('Error', error.message);
      }
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>GymApp</Text>
      <Text style={s.subtitle}>
        {isRegister ? 'Creá tu cuenta' : 'Ingresá para continuar'}
      </Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={s.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={s.buttonText}>{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={s.switchButton} onPress={() => setIsRegister(!isRegister)}>
        <Text style={s.switchText}>
          {isRegister ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
          <Text style={s.switchLink}>{isRegister ? 'Iniciá sesión' : 'Creá una'}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 24 },
    title: { color: c.text, fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    subtitle: { color: c.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 32 },
    input: { backgroundColor: c.surface, borderRadius: 12, color: c.text, fontSize: 16, padding: 16, marginBottom: 12 },
    button: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    switchButton: { marginTop: 20, alignItems: 'center' },
    switchText: { color: c.textSecondary, fontSize: 14 },
    switchLink: { color: c.accent, fontWeight: '600' },
  });

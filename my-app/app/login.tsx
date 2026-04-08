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

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>GymApp</Text>
      <Text style={s.subtitle}>Ingresá para continuar</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Iniciar sesión</Text>}
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
  });

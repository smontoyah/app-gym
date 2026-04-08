import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { ThemeSelector } from './_components/theme-selector';
import type { AppColorScheme } from '@/constants/theme';

export default function AjustesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <ThemeSelector />

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40, gap: 16 },
    profileCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    avatarText: { color: c.accentText, fontSize: 24, fontWeight: '800' },
    email: { color: c.textSecondary, fontSize: 14 },
    logoutBtn: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    logoutText: { color: c.danger, fontSize: 15, fontWeight: '600' },
  });

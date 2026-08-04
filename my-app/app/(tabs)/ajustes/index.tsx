import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { ThemeSelector } from './_components/theme-selector';
import { ExportModal } from './_components/export-modal';
import { GlossaryModal } from './_components/glossary-modal';
import type { AppColorScheme } from '@/constants/theme';

export default function AjustesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);
  const [showExport, setShowExport] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

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

      <View style={styles.group}>
        <TouchableOpacity style={styles.row} onPress={() => setShowGlossary(true)}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Conceptos del plan</Text>
            <Text style={styles.rowSubtitle}>RPE, RIR, super series, cadencia, clúster…</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.row} onPress={() => setShowExport(true)}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Exportar datos</Text>
            <Text style={styles.rowSubtitle}>CSV por rango de fechas, para análisis posterior</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <ExportModal visible={showExport} onClose={() => setShowExport(false)} />
      <GlossaryModal visible={showGlossary} onClose={() => setShowGlossary(false)} />
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
    group: { backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowText: { flex: 1 },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
    rowSubtitle: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    chevron: { color: c.textMuted, fontSize: 22, marginLeft: 8 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 16 },
    logoutBtn: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    logoutText: { color: c.danger, fontSize: 15, fontWeight: '600' },
  });

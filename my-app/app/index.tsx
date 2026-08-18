import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

/**
 * Selector de módulos: la pantalla que recibe al abrir la app.
 *
 * También es la ruta de entrada para "/". Sin este archivo, una instalación
 * nueva sin sesión abre en "/" —que no coincide con ninguna pantalla— y
 * expo-router muestra "Unmatched Route", que en release deja la app colgada
 * en el splash. Por eso el guard de sesión vive acá.
 */
export default function Index() {
  const { isLoggedIn, isLoading } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (isLoading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.hello}>Valtross</Text>
          <TouchableOpacity onPress={() => router.push('/ajustes')} hitSlop={12}>
            <IconSymbol size={24} name="gearshape.fill" color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ModuleCard
          colors={colors}
          icon="dumbbell.fill"
          title="Gym"
          subtitle="Entrenamiento, rutinas y estadísticas"
          onPress={() => router.push('/gym/ejercicio')}
        />
        <ModuleCard
          colors={colors}
          icon="fork.knife"
          title="Nutrición"
          subtitle="Diario, productos, recetas y objetivos"
          onPress={() => router.push('/nutricion')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ModuleCard({
  colors, icon, title, subtitle, onPress,
}: {
  colors: AppColorScheme;
  icon: 'dumbbell.fill' | 'fork.knife';
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const s = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.iconWrap}>
        <IconSymbol size={34} name={icon} color={colors.accent} />
      </View>
      <View style={s.cardText}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.cardSubtitle}>{subtitle}</Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingTop: 8, flexGrow: 1, justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 28,
    },
    hello: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      marginBottom: 14,
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 14,
      backgroundColor: c.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, marginLeft: 16 },
    cardTitle: { color: c.text, fontSize: 21, fontWeight: '700' },
    cardSubtitle: { color: c.textSecondary, fontSize: 13, marginTop: 3, lineHeight: 18 },
    chevron: { color: c.textMuted, fontSize: 26, fontWeight: '300' },
  });

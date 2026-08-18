import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

/** Vuelve al selector de módulos desde el header de Gym o Nutrición. */
export function ModuleBack() {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={12}
      style={styles.btn}>
      <Text style={[styles.chevron, { color: colors.headerText }]}>‹</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 2 },
  chevron: { fontSize: 30, lineHeight: 34, fontWeight: '300' },
});

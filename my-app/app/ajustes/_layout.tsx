import { Stack } from 'expo-router';
import { ModuleBack } from '@/components/module-back';
import { useTheme } from '@/hooks/use-theme';

export default function AjustesLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        title: 'Ajustes',
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerLeft: () => <ModuleBack />,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

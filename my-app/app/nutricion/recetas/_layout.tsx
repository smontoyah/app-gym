import { Stack } from 'expo-router';

// El header lo pone el tab de Nutrición; el editor trae su propia barra.
export default function RecetasLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

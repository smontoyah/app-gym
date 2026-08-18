import { Stack } from 'expo-router';

// El header lo pone el tab de Nutrición; el escáner trae su propia barra.
export default function CatalogoLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

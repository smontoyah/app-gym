import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

// Ruta de entrada para "/". Sin este archivo, una instalación nueva sin sesión
// abre en "/" — que no coincide con ninguna pantalla (las tabs viven en
// /ejercicio, /estadisticas… y el login en /login) — y expo-router muestra
// "Unmatched Route". Aquí redirigimos según el estado de autenticación.
export default function Index() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) return null;

  return <Redirect href={isLoggedIn ? '/(tabs)/ejercicio' : '/login'} />;
}

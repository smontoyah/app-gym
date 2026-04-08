import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors, type AppColorScheme } from '@/constants/theme';

const STORAGE_KEY = '@gym_theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColorScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: true,
  colors: AppColors.dark,
  setMode: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';
  const colors = isDark ? AppColors.dark : AppColors.light;

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors, setMode]
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

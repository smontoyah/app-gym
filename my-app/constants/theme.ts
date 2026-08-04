import { Platform } from 'react-native';

/**
 * Paleta de colores de la app para ambos modos.
 * Todos los componentes deben usar estos tokens en vez de colores hardcodeados.
 */
export const AppColors = {
  light: {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceSecondary: '#ebebeb',
    text: '#11181C',
    textSecondary: '#555555',
    textMuted: '#999999',
    accent: '#0a7ea4',
    accentText: '#ffffff',
    border: '#e0e0e0',
    borderDashed: '#cccccc',
    success: '#2e7d32',
    successBg: '#e8f5e9',
    danger: '#d32f2f',
    warning: '#b26a00',
    warningBg: '#fff4e0',
    accentBg: '#e3f2f7',
    placeholder: '#aaaaaa',
    tabBar: '#ffffff',
    tabBarBorder: '#e0e0e0',
    tabBarActive: '#0a7ea4',
    tabBarInactive: '#888888',
    header: '#ffffff',
    headerText: '#11181C',
  },
  dark: {
    background: '#0f0f0f',
    surface: '#1a1a1a',
    surfaceSecondary: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#888888',
    textMuted: '#666666',
    accent: '#0a7ea4',
    accentText: '#ffffff',
    border: '#1a1a1a',
    borderDashed: '#333333',
    success: '#2a6a2a',
    successBg: '#1a2a1a',
    danger: '#ff4444',
    warning: '#ffab2e',
    warningBg: '#2a2110',
    accentBg: '#0e2a33',
    placeholder: '#999999',
    tabBar: '#0f0f0f',
    tabBarBorder: '#1a1a1a',
    tabBarActive: '#0a7ea4',
    tabBarInactive: '#666666',
    header: '#0f0f0f',
    headerText: '#ffffff',
  },
};

export type AppColorScheme = (typeof AppColors)['dark'];

// Legacy — mantenido por compatibilidad con componentes del template
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

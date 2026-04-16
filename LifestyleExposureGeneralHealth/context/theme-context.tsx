// context/theme-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  danger: string;
  icon: string;
  surface: string;
  surfaceHighlight: string;
  inputBackground: string;
  overlay: string;
  borderHighlight: string;
}

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
}

const THEME_STORAGE_KEY = '@nourish_theme_mode';

const lightColors: ThemeColors = {
  background: '#F5F5F5',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E5E5E7',
  primary: '#8B5CF6',
  success: '#22C55E',
  danger: '#EF4444',
  icon: '#000000',
  surface: '#FFFFFF',
  surfaceHighlight: '#F0EBF8',
  inputBackground: '#F0F0F0',
  overlay: 'rgba(0,0,0,0.5)',
  borderHighlight: '#D0D0D0',
};

const darkColors: ThemeColors = {
  background: '#0D0D1A',
  backgroundSecondary: '#1C1C2E',
  card: '#1A1A2E',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#6B6B8A',
  border: '#2D2D3D',
  primary: '#8B5CF6',
  success: '#22C55E',
  danger: '#EF4444',
  icon: '#FFFFFF',
  surface: '#1A1A2E',
  surfaceHighlight: '#252536',
  inputBackground: '#212121',
  overlay: 'rgba(0,0,0,0.74)',
  borderHighlight: '#3D3D4D',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  // Determine if dark mode based on theme mode setting
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('System theme changed to:', colorScheme);
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  // Always call hooks at the top level unconditionally
  const systemColorScheme = useColorScheme();
  const context = useContext(ThemeContext);

  // If context exists, use it
  if (context !== undefined) {
    return context;
  }

  // Fallback if used outside provider - use the already-called hook value
  const isDark = systemColorScheme === 'dark';
  return {
    isDark,
    themeMode: 'system' as ThemeMode,
    setThemeMode: () => {
      console.warn('useTheme: setThemeMode called outside of ThemeProvider');
    },
    colors: isDark ? darkColors : lightColors,
  };
}

// Export colors for direct use
export { lightColors, darkColors };
export type { ThemeColors };

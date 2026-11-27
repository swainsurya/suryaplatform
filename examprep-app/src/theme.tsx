import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  surface: string;
  surfaceAlt: string;
  headerBackground: string;
  headerBorder: string;
  statusBar: 'light-content' | 'dark-content';
  statusBarBg: string;
  statusBarStyle: 'light' | 'dark';
  radius: number;
}

export const shadcnLight: ThemeColors = {
  background: '#FFFFFF',
  foreground: '#09090B',
  card: '#FFFFFF',
  cardForeground: '#09090B',
  popover: '#FFFFFF',
  popoverForeground: '#09090B',
  primary: '#09090B',
  primaryForeground: '#FAFAFA',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  muted: '#F4F4F5',
  mutedForeground: '#71717A',
  accent: '#F4F4F5',
  accentForeground: '#18181B',
  destructive: '#EF4444',
  destructiveForeground: '#FAFAFA',
  border: '#E4E4E7',
  input: '#E4E4E7',
  ring: '#18181B',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  headerBackground: '#FFFFFF',
  headerBorder: '#E2E8F0',
  statusBar: 'dark-content',
  statusBarBg: '#FFFFFF',
  statusBarStyle: 'dark',
  radius: 12,
};

export const shadcnDark: ThemeColors = {
  background: '#09090B',
  foreground: '#FAFAFA',
  card: '#18181B',
  cardForeground: '#FAFAFA',
  popover: '#18181B',
  popoverForeground: '#FAFAFA',
  primary: '#FAFAFA',
  primaryForeground: '#09090B',
  secondary: '#27272A',
  secondaryForeground: '#F4F4F5',
  muted: '#27272A',
  mutedForeground: '#A1A1AA',
  accent: '#27272A',
  accentForeground: '#F4F4F5',
  destructive: '#EF4444',
  destructiveForeground: '#FAFAFA',
  border: '#27272A',
  input: '#27272A',
  ring: '#D4D4D8',
  surface: '#09090B',
  surfaceAlt: '#141417',
  headerBackground: '#111113',
  headerBorder: '#27272A',
  statusBar: 'light-content',
  statusBarBg: '#111113',
  statusBarStyle: 'light',
  radius: 12,
};

// Backward-compatible export
export const shadcn = shadcnLight;

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  theme: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = '@examprep_theme_mode';

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  theme: shadcnLight,
  setMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = isDark ? shadcnDark : shadcnLight;

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, theme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const colors = {
  primary: '#3525CD',
  primaryContainer: '#4F46E5',
  primaryFixed: '#E2DFFF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#DAD7FF',
  onPrimaryFixed: '#0F0069',

  secondary: '#6B38D4',
  secondaryContainer: '#8455EF',
  secondaryFixed: '#E9DDFF',
  onSecondary: '#FFFFFF',
  onSecondaryFixed: '#23005C',

  tertiary: '#006E4B',
  tertiaryContainer: '#005338',
  tertiaryFixed: '#6FFBBE',
  tertiaryFixedDim: '#4EDEA3',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#67F4B7',
  onTertiaryFixed: '#002113',

  background: '#FAF8FF',
  surface: '#FAF8FF',
  surfaceBright: '#FAF8FF',
  surfaceDim: '#D2D9F4',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2F3FF',
  surfaceContainer: '#EAEDFF',
  surfaceContainerHigh: '#E2E7FF',
  surfaceContainerHighest: '#DAE2FD',

  onSurface: '#131B2E',
  onSurfaceVariant: '#464555',
  outline: '#777587',
  outlineVariant: '#C7C4D8',

  inverseSurface: '#1E293B',
  inverseOnSurface: '#EEF0FF',

  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onError: '#FFFFFF',
  onErrorContainer: '#93000A',
};

export const darkColors = {
  primary: '#818CF8',
  primaryContainer: '#4338CA',
  primaryFixed: '#312E81',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#EEF2FF',
  onPrimaryFixed: '#E0E7FF',

  secondary: '#A78BFA',
  secondaryContainer: '#7C3AED',
  secondaryFixed: '#4C1D95',
  onSecondary: '#FFFFFF',
  onSecondaryFixed: '#EDE9FE',

  tertiary: '#10B981',
  tertiaryContainer: '#065F46',
  tertiaryFixed: '#A7F3D0',
  tertiaryFixedDim: '#34D399',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#D1FAE5',

  background: '#0B1120',
  surface: '#0F172A',
  surfaceBright: '#1E293B',
  surfaceDim: '#020617',
  surfaceContainerLowest: '#1E293B',
  surfaceContainerLow: '#182234',
  surfaceContainer: '#243247',
  surfaceContainerHigh: '#334155',
  surfaceContainerHighest: '#475569',

  onSurface: '#F8FAFC',
  onSurfaceVariant: '#94A3B8',
  outline: '#64748B',
  outlineVariant: '#475569',

  inverseSurface: '#F8FAFC',
  inverseOnSurface: '#0F172A',

  error: '#EF4444',
  errorContainer: '#7F1D1D',
  onError: '#FFFFFF',
  onErrorContainer: '#FEE2E2',
};

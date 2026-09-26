import React, { createContext, useContext, useState } from 'react';
import { useColorScheme, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ThemeType = 'light' | 'dark';

/**
 * SIH Cerulean Theme — Light Mode
 * Premium oceanic blue palette with clean whites and subtle blue-tinted surfaces.
 */
const lightColors = {
  /* ─── Surfaces ─── */
  background: '#F0F9FF',
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',
  surface: '#EFF6FF',

  /* ─── Text ─── */
  text: '#0C1929',
  textSecondary: '#334155',
  textMuted: '#64748B',

  /* ─── Borders ─── */
  border: '#CBD5E1',
  borderLight: '#E2E8F0',
  borderAccent: '#7DD3FC',

  /* ─── Brand ─── */
  primary: '#0284C7',
  primaryLight: '#38BDF8',
  primaryDark: '#0369A1',
  primarySurface: '#E0F2FE',

  /* ─── Category Card Backgrounds ─── */
  skyCard: '#FFFFFF',
  skyBorder: '#BAE6FD',
  rainCard: '#FFFFFF',
  rainBorder: '#99F6E4',
  windCard: '#FFFFFF',
  windBorder: '#A7F3D0',
  alertCard: '#FFFBEB',
  alertBorder: '#FDE68A',

  /* ─── Tab Bar ─── */
  tabBar: 'rgba(255,255,255,0.92)',
  tabBarBorder: '#E2E8F0',
  tabActive: '#0284C7',
  tabInactive: '#94A3B8',

  /* ─── Semantic ─── */
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  /* ─── Gradients ─── */
  backgroundGradient: ['#E0F2FE', '#F8FAFC'] as [string, string],
  cardGradient: ['#FFFFFF', '#F8FAFC'] as [string, string],
  skyGradient: ['#F0F9FF', '#E0F2FE'] as [string, string],
  rainGradient: ['#F0FDFA', '#CCFBF1'] as [string, string],
  windGradient: ['#F0FDF4', '#DCFCE7'] as [string, string],
  alertGradient: ['#FFFBEB', '#FEF3C7'] as [string, string],
  plainGradient: ['#FFFFFF', '#F8FAFC'] as [string, string],

  /* ─── Shadows ─── */
  shadowColor: '#0284C7',

  /* ─── Overlays ─── */
  overlay: 'rgba(12, 25, 41, 0.45)',
  frosted: 'rgba(255, 255, 255, 0.85)',
};

/**
 * SIH Cerulean Theme — Dark Mode
 * Deep oceanic dark with cyan-blue accents and warm slate neutrals.
 */
const darkColors = {
  /* ─── Surfaces ─── */
  background: '#0C1929',
  card: '#132238',
  cardAlt: '#182B46',
  surface: '#0F1D30',

  /* ─── Text ─── */
  text: '#F0F9FF',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

  /* ─── Borders ─── */
  border: '#1E3A5F',
  borderLight: '#253D5E',
  borderAccent: '#0EA5E9',

  /* ─── Brand ─── */
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryDark: '#0EA5E9',
  primarySurface: '#0C3B5F',

  /* ─── Category Card Backgrounds ─── */
  skyCard: '#13233C',
  skyBorder: '#1E4770',
  rainCard: '#112933',
  rainBorder: '#145365',
  windCard: '#112B26',
  windBorder: '#145643',
  alertCard: '#2D1B17',
  alertBorder: '#5C2D1F',

  /* ─── Tab Bar ─── */
  tabBar: 'rgba(12, 25, 41, 0.95)',
  tabBarBorder: '#1E3A5F',
  tabActive: '#38BDF8',
  tabInactive: '#64748B',

  /* ─── Semantic ─── */
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',

  /* ─── Gradients ─── */
  backgroundGradient: ['#08121E', '#0F1E32'] as [string, string],
  cardGradient: ['#132238', '#0F1D30'] as [string, string],
  skyGradient: ['#152844', '#0E1D33'] as [string, string],
  rainGradient: ['#122E3A', '#0D212B'] as [string, string],
  windGradient: ['#12312A', '#0D241F'] as [string, string],
  alertGradient: ['#331E19', '#241410'] as [string, string],
  plainGradient: ['#132238', '#0F1D30'] as [string, string],

  /* ─── Shadows ─── */
  shadowColor: '#000000',

  /* ─── Overlays ─── */
  overlay: 'rgba(0, 0, 0, 0.55)',
  frosted: 'rgba(12, 25, 41, 0.85)',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextProps {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(systemTheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

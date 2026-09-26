/**
 * SIH Cerulean Design System — Design Tokens
 * Modern oceanic-blue palette for a premium weather/agriculture mobile experience.
 */
export const tokens = {
  colors: {
    /* ─── Cerulean Primary Spectrum ─── */
    cerulean50: '#ECFEFF',
    cerulean100: '#CFFAFE',
    cerulean200: '#A5F3FC',
    cerulean300: '#67E8F9',
    cerulean400: '#22D3EE',
    cerulean500: '#06B6D4',
    cerulean600: '#0891B2',
    cerulean700: '#0E7490',
    cerulean800: '#155E75',
    cerulean900: '#164E63',

    /* ─── Sky Blue Accent ─── */
    sky50: '#F0F9FF',
    sky100: '#E0F2FE',
    sky200: '#BAE6FD',
    sky300: '#7DD3FC',
    sky400: '#38BDF8',
    sky500: '#0EA5E9',
    sky600: '#0284C7',
    sky700: '#0369A1',
    sky800: '#075985',
    sky900: '#0C4A6E',

    /* ─── Slate Neutrals ─── */
    slate50: '#F8FAFC',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate300: '#CBD5E1',
    slate400: '#94A3B8',
    slate500: '#64748B',
    slate600: '#475569',
    slate700: '#334155',
    slate800: '#1E293B',
    slate900: '#0F172A',
    slate950: '#020617',

    /* ─── Semantic Colors ─── */
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    /* ─── Card Category Colors ─── */
    cardBackgrounds: {
      sky: '#DBEAFE',
      skyDark: '#0C3B5F',
      rain: '#CCFBF1',
      rainDark: '#134E4A',
      wind: '#DCFCE7',
      windDark: '#14532D',
      alert: '#FFF7ED',
      alertDark: '#431407',
      market: '#F0FDF4',
    },
    cardBorders: {
      sky: '#93C5FD',
      skyDark: '#1E5A8A',
      rain: '#5EEAD4',
      rainDark: '#0F766E',
      wind: '#86EFAC',
      windDark: '#15803D',
      alert: '#FED7AA',
      alertDark: '#9A3412',
    },
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  typography: {
    sizes: {
      xxs: 9,
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
      hero: 36,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    letterSpacing: {
      tight: -0.3,
      normal: 0,
      wide: 0.3,
      wider: 0.6,
      widest: 1.0,
    },
  },

  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

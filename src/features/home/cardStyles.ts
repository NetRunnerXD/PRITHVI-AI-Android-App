import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../context/ThemeContext';

export function homeCardStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    /* ─── Card Shell ─── */
    card: {
      borderRadius: 22,
      padding: 16,
      borderWidth: 1.5,
      marginBottom: 14,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.25 : 0.07,
      shadowRadius: 14,
      elevation: isDark ? 3 : 4,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },

    /* ─── Card Title ─── */
    cardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },

    /* ─── Category Variants ─── */
    skyCard: { backgroundColor: colors.skyCard, borderColor: colors.skyBorder },
    rainCard: { backgroundColor: colors.rainCard, borderColor: colors.rainBorder },
    windCard: { backgroundColor: colors.windCard, borderColor: colors.windBorder },
    alertCard: { backgroundColor: colors.alertCard, borderColor: colors.alertBorder },
    plainCard: { backgroundColor: colors.card, borderColor: isDark ? colors.border : colors.borderLight },

    /* ─── Inner Content Card (Glassmorphic) ─── */
    innerCard: {
      backgroundColor: isDark ? 'rgba(15, 29, 48, 0.72)' : 'rgba(255, 255, 255, 0.88)',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.15 : 0.03,
      shadowRadius: 6,
      elevation: isDark ? 1 : 2,
    },

    /* ─── Pills / Badges ─── */
    pill: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 10,
    },
    pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

    /* ─── Metric Grid ─── */
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gridItem: {
      width: '31%',
      minWidth: 92,
      backgroundColor: isDark ? 'rgba(15, 29, 48, 0.65)' : 'rgba(255, 255, 255, 0.82)',
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.85)',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.03,
      shadowRadius: 4,
    },
    gridTitle: {
      fontSize: 10.5,
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    gridValue: {
      fontSize: 16.5,
      fontWeight: '800',
      color: colors.text,
      marginTop: 4,
      letterSpacing: -0.2,
    },
    gridUnit: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

    /* ─── Typography ─── */
    tempBig: { fontSize: 38, fontWeight: '900', color: colors.text, letterSpacing: -1 },
    muted: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
    body: { fontSize: 13.5, color: colors.text, lineHeight: 19 },

    /* ─── Hazard Mini Cards ─── */
    hazard: {
      width: '48%',
      borderRadius: 16,
      padding: 12,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : colors.borderLight,
      backgroundColor: colors.card,
      marginBottom: 8,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.1 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    hazardTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.4,
    },
    hazardVal: { fontSize: 16.5, fontWeight: '800', color: colors.text, marginTop: 4 },
    hazardSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  });
}

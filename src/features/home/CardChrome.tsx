import React from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { homeCardStyles as stylesOf } from './cardStyles';
import { useCardSummaryMode } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';

export function CardChrome({
  title,
  accent,
  children,
  onTitlePress,
  gradientColors,
  style,
}: {
  title: string;
  accent: string;
  children: (p: { isSummary: boolean; s: ReturnType<typeof stylesOf> }) => React.ReactNode;
  onTitlePress?: () => void;
  gradientColors?: [string, string];
  style?: object;
}) {
  const { colors, isDark } = useTheme();
  const s = stylesOf(colors, isDark);
  const { isSummary, toggle } = useCardSummaryMode();
  const { t } = require('react-i18next').useTranslation();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };
  
  const content = (
    <>
      <View style={s.cardHeader}>
        <TouchableOpacity
          disabled={!onTitlePress}
          onPress={onTitlePress}
          activeOpacity={onTitlePress ? 0.6 : 1}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
        >
          <View style={[s.dot, { backgroundColor: accent, shadowColor: accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
          <Text style={s.cardTitle}>{title}</Text>
          {onTitlePress ? (
            <View style={{ backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.1)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '800' }}>→</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleSummary}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.12)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(56,189,248,0.3)' : 'rgba(2,132,199,0.2)',
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>
            {isSummary ? t('detail') : t('summary')}
          </Text>
        </TouchableOpacity>
      </View>
      <SmoothFadeView activeKey={isSummary}>
        {children({ isSummary, s })}
      </SmoothFadeView>
    </>
  );

  if (gradientColors) {
    return (
      <LinearGradient colors={gradientColors} style={[s.card, style]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[s.card, style]}>
      {content}
    </View>
  );
}

export function MiniTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors, isDark } = useTheme();

  const handleTabPress = (tab: string) => {
    if (tab === value) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChange(tab);
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => handleTabPress(tab)}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 10,
            backgroundColor: value === tab ? colors.primary : 'transparent',
            borderWidth: 1.5,
            borderColor: value === tab ? colors.primary : isDark ? colors.border : colors.borderLight,
          }}
        >
          <Text style={{
            fontSize: 10,
            fontWeight: '800',
            color: value === tab ? '#fff' : colors.textMuted,
            letterSpacing: 0.3,
          }}>
            {tab.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, Database } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { tabSourceLines, type SourceTab } from './tabSources';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TabSourcesCard({
  tab,
  provenance,
  compact,
}: {
  tab: SourceTab;
  provenance?: Record<string, unknown>;
  compact?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lines = tabSourceLines(tab, i18n.language || 'en');
  const prov = Object.entries(provenance || {}).filter(([k, v]) => k !== 'as_of' && v != null);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: compact ? 12 : 16,
        borderWidth: 1.5,
        borderColor: isDark ? colors.border : colors.borderLight,
        padding: compact ? 10 : 14,
        marginTop: compact ? 8 : 0,
        marginBottom: compact ? 0 : 12,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((v) => !v);
        }}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Database size={15} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: 0.4 }}>
              {t('sources')}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{t('sourcesSub')}</Text>
          </View>
        </View>
        {open ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          {lines.map((line) => (
            <Text key={line} style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
              • {line}
            </Text>
          ))}
          {prov.length ? (
            <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: isDark ? colors.border : colors.borderLight, paddingTop: 8 }}>
              {prov.slice(0, 8).map(([k, v]) => (
                <Text key={k} style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{k}</Text> — {String(v)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

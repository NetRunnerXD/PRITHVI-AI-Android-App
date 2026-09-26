import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, Database } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { homeCardStyles as stylesOf } from './cardStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function SourcesRow({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const s = stylesOf(colors, isDark);
  const [expanded, setExpanded] = useState(false);

  const src = dash.sources || [];
  const prov = dash.science?.provenance || {};
  if (!src.length && !Object.keys(prov).length) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={[s.card, s.plainCard, { paddingVertical: 12 }]}>
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Database size={15} color={colors.primary} />
          <Text style={[s.cardTitle, { letterSpacing: 0.6 }]}>
            {t('sources') || 'SOURCES'}
          </Text>
          <View
            style={{
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 10,
              marginLeft: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
              {src.length}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {expanded ? (
        <View style={[s.innerCard, { marginTop: 12 }]}>
          {src.length > 0 ? (
            <View style={{ marginBottom: Object.keys(prov).length ? 10 : 0 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                Active Providers
              </Text>
              <Text style={[s.muted, { lineHeight: 18 }]}>{src.join(' · ')}</Text>
            </View>
          ) : null}

          {Object.keys(prov).length > 0 ? (
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                Model Provenance
              </Text>
              {Object.entries(prov).slice(0, 8).map(([k, v]) => (
                <Text key={k} style={[s.muted, { fontSize: 11, marginTop: 3 }]}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{k}</Text>: {String(v)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

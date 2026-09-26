import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useViewMode } from '../../context/ViewModeContext';

export type CardSummary = {
  headline: string;
  badge: string;
  points?: string[];
  metrics?: Array<{ label: string; value: string }>;
};

export function laymanToCard(s: {
  headline: string;
  badge: { label: string };
  metrics?: Array<{ label: string; value: string }>;
  points?: string[];
}): CardSummary {
  return { headline: s.headline, badge: s.badge.label, metrics: s.metrics, points: s.points };
}

export function useCardSummaryMode() {
  const { isOverview } = useViewMode();
  const [local, setLocal] = React.useState<boolean | null>(null);
  const isSummary = local !== null ? local : isOverview;
  return { isSummary, toggle: () => setLocal((v) => !(v ?? isOverview)), isOverview };
}

export function SummaryBlock({
  summary,
  onExpand,
}: {
  summary: CardSummary;
  onExpand?: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{
          backgroundColor: isDark ? colors.primarySurface : colors.primarySurface,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: isDark ? colors.borderAccent : colors.primaryLight,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 }}>{summary.badge}</Text>
        </View>
        {onExpand ? (
          <TouchableOpacity onPress={onExpand} activeOpacity={0.6}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Detail →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 }}>{summary.headline}</Text>
      {summary.metrics && summary.metrics.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {summary.metrics.slice(0, 4).map((m) => (
            <View key={m.label} style={{
              width: '47%',
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderRadius: 10,
              padding: 8,
              borderWidth: 1,
              borderColor: isDark ? colors.border : colors.borderLight,
            }}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{m.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>{m.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {(summary.points || []).slice(0, 2).map((p) => (
        <Text key={p} style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 }}>
          • {p}
        </Text>
      ))}
    </View>
  );
}

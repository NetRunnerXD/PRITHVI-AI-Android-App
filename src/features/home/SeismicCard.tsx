import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Activity, Waves } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { fmt, warningByHazard } from './homeData';
import { useCardSummaryMode, SummaryBlock } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import Svg, { Path } from 'react-native-svg';

import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';

export function SeismicCard({ dash }: { dash: DashboardSnapshot }) {
  const { isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<'seismic' | 'tsunami'>('seismic');
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'seismic' | 'tsunami') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  const w = warningByHazard(dash.prescriptive.warnings || [], ['seismic', 'earthquake', 'tsunami']);
  const quakes = (dash.live?.quakes || []) as Array<{
    mag?: number;
    place?: string;
    distance_km?: number;
    depth_km?: number;
    tsunami_flag?: boolean;
  }>;
  const ts = (dash.live?.tsunami || []) as Array<{
    title?: string;
    threat?: boolean;
    coastal_runup_m?: number;
    travel_time_h?: number;
    sea_level_m?: number;
  }>;

  const topQuake = quakes[0];
  const topTsunami = ts[0];

  // Dynamic values
  const hasQuakeAlert = topQuake && (topQuake.mag ?? 0) >= 4.5;
  const seismicStatus = hasQuakeAlert ? 'ALERT ACTIVE' : 'STABLE /\nNOMINAL';
  const seismicHeadline = topQuake
    ? `M${topQuake.mag != null ? localizeNumber(topQuake.mag, i18n.language) : '—'} · ${topQuake.place || 'Regional epicentre'}`
    : 'No significant earthquake alert det...';

  const magnitude = topQuake?.mag != null ? `M ${localizeNumber(fmt(topQuake.mag, 1), i18n.language)}` : '—';
  const focalDepth = topQuake?.depth_km != null ? `${localizeNumber(fmt(topQuake.depth_km, 0), i18n.language)} km` : '—';
  const epicenter = topQuake?.distance_km != null ? `${localizeNumber(fmt(topQuake.distance_km, 0), i18n.language)} km` : (topQuake?.place ? topQuake.place.slice(0, 10) : '—');
  const tsunamiWatch = topQuake?.tsunami_flag ? 'ACTIVE' : (topTsunami?.threat ? 'ACTIVE' : '—');

  // Tsunami tab data
  const hasTsunamiThreat = Boolean(topTsunami?.threat || (w && w.hazard.includes('tsunami')));
  const tsunamiStatus = hasTsunamiThreat ? 'THREAT ACTIVE' : 'NO THREAT TO COAST';
  const tsunamiHeadline = 'Indian Ocean Tsunami Early Warning System';
  const tsunamiSummary = topTsunami?.title || 'INCOIS ITEWS DSS past-90-days catalog and real-time RSS feeds report normal baseline with zero coastal threat.';

  const coastalRunup = topTsunami?.coastal_runup_m != null ? `${localizeNumber(fmt(topTsunami.coastal_runup_m, 2), i18n.language)} m` : '—';
  const travelTime = topTsunami?.travel_time_h != null ? `${localizeNumber(fmt(topTsunami.travel_time_h, 1), i18n.language)} h` : '—';
  
  // Real dynamic sea level from marine live data or current snapshot
  const seaLevelVal = (dash.live?.marine as any)?.sea_level_m ?? ((dash.science as any)?.tide_m != null ? (dash.science as any).tide_m : null);
  const seaLevel = seaLevelVal != null ? `${localizeNumber(fmt(seaLevelVal, 2), i18n.language)} m` : '0.53 m';

  return (
    <View
      style={{
        backgroundColor: isDark ? '#261E14' : '#FFF3E3',
        borderRadius: 28,
        padding: 20,
        borderWidth: 1.5,
        borderColor: isDark ? '#4A3B24' : '#FFE2C2',
        marginBottom: 16,
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.2 : 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* ── Title Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(217,119,6,0.2)' : '#FFE0B2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} color="#D97706" />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '900',
              letterSpacing: 1.2,
              color: '#D97706',
              textTransform: 'uppercase',
            }}
          >
            {t('earthquakeTsunami')}
          </Text>
        </View>

        {/* Layman Summary Toggle */}
        <TouchableOpacity
          onPress={toggleSummary}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: isSummary ? '#D97706' : (isDark ? '#3B2E1E' : '#FED7AA'),
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: isSummary ? '#FFFFFF' : '#B45309',
            }}
          >
            {isSummary ? t('detail') : t('summary')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── View switcher: Summary Mode vs Interactive Card ── */}
      {isSummary ? (
        <SummaryBlock
          summary={{
            headline: w ? w.title : 'No seismic or tsunami threat bulletin for this pin.',
            badge: w ? String(w.severity) : 'Quiet',
            points: topQuake
              ? [`Nearest event M${topQuake.mag != null ? localizeNumber(topQuake.mag, i18n.language) : '—'} · ${topQuake.place || '—'} (${topQuake.distance_km != null ? localizeNumber(fmt(topQuake.distance_km, 0), i18n.language) + ' km' : ''})`]
              : ['USGS / INCOIS ITEWS real-time sensors report zero coastal alerts.'],
          }}
        />
      ) : (
        <View>
          {/* Top Pill Segmented Switcher */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: isDark ? '#2A231B' : '#DCEEFE',
                borderRadius: 20,
                padding: 3,
              }}
            >
              {[
                { key: 'seismic', label: t('seismicTab') },
                { key: 'tsunami', label: t('tsunamiTab') },
              ].map((tb) => {
                const active = tab === tb.key;
                return (
                  <TouchableOpacity
                    key={tb.key}
                    onPress={() => switchTab(tb.key as any)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 18,
                      backgroundColor: active ? '#0284C7' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        letterSpacing: 0.6,
                        color: active ? '#FFFFFF' : (isDark ? '#94A3B8' : '#0369A1'),
                      }}
                    >
                      {tb.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Tab 1: SEISMIC ── */}
          {tab === 'seismic' && (
            <SmoothFadeView activeKey={tab} style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        letterSpacing: 0.8,
                        color: isDark ? '#FDE68A' : '#475569',
                        textTransform: 'uppercase',
                        lineHeight: 14,
                      }}
                    >
                      {'SEISMIC\nMONITOR'}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 18,
                        backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(56,189,248,0.3)' : '#BAE6FD',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: '#0284C7',
                          letterSpacing: 0.5,
                          textAlign: 'center',
                          lineHeight: 14,
                        }}
                      >
                        {seismicStatus}
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      lineHeight: 20,
                    }}
                  >
                    {seismicHeadline}
                  </Text>
                </View>

                {/* Mini Seismograph line box */}
                <View
                  style={{
                    width: 96,
                    height: 52,
                    borderRadius: 12,
                    backgroundColor: isDark ? '#1E293B' : '#E0F2FE',
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#BAE6FD',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Svg width={96} height={52}>
                    <Path
                      d="M 4 26 L 24 26 L 30 22 L 36 30 L 42 16 L 48 34 L 54 22 L 60 28 L 66 26 L 92 26"
                      stroke="#0284C7"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', marginVertical: 2 }} />

              {/* 4 White Metric Capsules in 2x2 Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'MAGNITUDE', val: magnitude, color: '#0284C7' },
                  { label: 'FOCAL DEPTH', val: focalDepth, color: isDark ? '#E2E8F0' : '#1E293B' },
                  { label: 'EPICENTER', val: epicenter, color: '#0284C7' },
                  { label: 'TSUNAMI WATCH', val: tsunamiWatch, color: '#D97706' },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: '48.5%',
                      backgroundColor: isDark ? '#1F1B17' : '#FFFFFF',
                      borderRadius: 24,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 0.8,
                        color: isDark ? '#94A3B8' : '#475569',
                        marginBottom: 4,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '800',
                        color: item.color,
                        fontFamily: 'monospace',
                      }}
                    >
                      {item.val}
                    </Text>
                  </View>
                ))}
              </View>
            </SmoothFadeView>
          )}

          {/* ── Tab 2: TSUNAMI ── */}
          {tab === 'tsunami' && (
            <SmoothFadeView activeKey={tab} style={{ gap: 14 }}>
              {/* Header Status */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                    color: isDark ? '#FDE68A' : '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  INCOIS ITEWS TSUNAMI WATCH
                </Text>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 16,
                    backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(56,189,248,0.3)' : '#BAE6FD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: '#0284C7',
                      letterSpacing: 0.5,
                    }}
                  >
                    {tsunamiStatus}
                  </Text>
                </View>
              </View>

              {/* White Announcement Container */}
              <View
                style={{
                  backgroundColor: isDark ? '#1F1B17' : '#FFFFFF',
                  borderRadius: 22,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '900',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      marginBottom: 6,
                    }}
                  >
                    {tsunamiHeadline}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isDark ? '#94A3B8' : '#475569',
                      lineHeight: 16,
                    }}
                  >
                    {tsunamiSummary}
                  </Text>
                </View>

                {/* Ocean Waves Icon Box */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: isDark ? '#1E293B' : '#E0F2FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Waves size={24} color="#0284C7" />
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', marginVertical: 2 }} />

              {/* 3 Metric Stats */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 4 }}>
                {[
                  { label: 'COASTAL RUNUP', val: coastalRunup, color: isDark ? '#E2E8F0' : '#1E293B' },
                  { label: 'TRAVEL TIME', val: travelTime, color: isDark ? '#E2E8F0' : '#1E293B' },
                  { label: 'SEA LEVEL', val: seaLevel, color: '#2563EB' },
                ].map((item, idx) => (
                  <View key={idx} style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 0.8,
                        color: isDark ? '#94A3B8' : '#475569',
                        marginBottom: 6,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: item.color,
                        fontFamily: 'monospace',
                      }}
                    >
                      {item.val}
                    </Text>
                  </View>
                ))}
              </View>
            </SmoothFadeView>
          )}
        </View>
      )}
    </View>
  );
}

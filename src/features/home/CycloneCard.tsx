import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Animated, Easing } from 'react-native';
import { Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';
import type { DashboardSnapshot } from '../../types';
import { fmt, warningByHazard } from './homeData';
import { useCardSummaryMode, SummaryBlock } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import Svg, { Circle, Line as SvgLine, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

function AnimatedRadar({ isDark, isThreat }: { isDark: boolean; isThreat: boolean }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 360-degree radar sweep loop
    const sweep = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    sweep.start();

    // Subtle pulsing blip animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      sweep.stop();
      pulse.stop();
    };
  }, [rotateAnim, pulseAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const radarBg = isDark ? '#1E293B' : '#E0F2FE';
  const ringColor = isDark ? 'rgba(56,189,248,0.25)' : '#BAE6FD';
  const beamColor = isThreat ? '#F43F5E' : '#0284C7';

  return (
    <View
      style={{
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: radarBg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: ringColor,
      }}
    >
      {/* Static Grid & Range Rings */}
      <Svg width={68} height={68} style={{ position: 'absolute' }}>
        <Circle cx={34} cy={34} r={30} stroke={ringColor} strokeWidth={1} fill="none" />
        <Circle cx={34} cy={34} r={20} stroke={ringColor} strokeWidth={1} strokeDasharray="3,3" fill="none" />
        <Circle cx={34} cy={34} r={10} stroke={ringColor} strokeWidth={1} fill="none" />
        <SvgLine x1={34} y1={4} x2={34} y2={64} stroke={ringColor} strokeWidth={0.75} />
        <SvgLine x1={4} y1={34} x2={64} y2={34} stroke={ringColor} strokeWidth={0.75} />
      </Svg>

      {/* Rotating Radar Sweep Beam */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 68,
          height: 68,
          transform: [{ rotate: spin }],
        }}
      >
        <Svg width={68} height={68}>
          <Defs>
            <LinearGradient id="radarSweep" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={beamColor} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={beamColor} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          {/* Radar Sector Arc */}
          <Path
            d="M 34 34 L 34 4 A 30 30 0 0 1 64 34 Z"
            fill="url(#radarSweep)"
          />
          <SvgLine x1={34} y1={34} x2={34} y2={4} stroke={beamColor} strokeWidth={1.75} strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Center Pivot Dot with Animated Radar Pulse */}
      <Animated.View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: beamColor,
          opacity: 0.35,
          position: 'absolute',
          transform: [{ scale: pulseAnim }],
        }}
      />
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: beamColor,
          position: 'absolute',
        }}
      />
    </View>
  );
}

export function CycloneCard({ dash }: { dash: DashboardSnapshot }) {
  const { isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const w = warningByHazard(dash.prescriptive.warnings || [], ['cyclone', 'depression', 'storm']);
  const liveCyclone = (dash.live?.sky as any)?.cyclone || (dash.science as any)?.cyclone;
  
  const isThreat = Boolean(w || liveCyclone?.active);
  const statusBadge = isThreat ? t('activeBulletin') : t('quietNormal');
  const headline = w
    ? w.title
    : t('noActiveStorm');

  const category = liveCyclone?.category 
    ? String(liveCyclone.category)
    : (isThreat ? (w?.severity ? String(w.severity).toUpperCase() : 'ACTIVE') : 'NIL / QUIET');
  const maxWinds = liveCyclone?.max_winds_kmh != null ? `${localizeNumber(fmt(liveCyclone.max_winds_kmh, 0), i18n.language)} km/h` : '—';
  const pressure = liveCyclone?.pressure_hpa != null ? `${localizeNumber(fmt(liveCyclone.pressure_hpa, 0), i18n.language)} hPa` : '—';
  const distance = liveCyclone?.distance_km != null ? `${localizeNumber(fmt(liveCyclone.distance_km, 0), i18n.language)} km` : (w?.distance_km != null ? `${localizeNumber(fmt(w.distance_km, 0), i18n.language)} km` : '—');

  return (
    <View
      style={{
        backgroundColor: isDark ? '#261214' : '#FFEBEB',
        borderRadius: 28,
        padding: 20,
        borderWidth: 1.5,
        borderColor: isDark ? '#4A1D24' : '#FFD6D6',
        marginBottom: 16,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.2 : 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* ── Title Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(244,63,94,0.2)' : '#FFD9DF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Compass size={18} color="#F43F5E" />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '900',
              letterSpacing: 1.2,
              color: '#F43F5E',
              textTransform: 'uppercase',
            }}
          >
            {t('tropicalCyclones')}
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
            backgroundColor: isSummary ? '#F43F5E' : (isDark ? '#3B181E' : '#FED7DE'),
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: isSummary ? '#FFFFFF' : '#E11D48',
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
            headline: w ? w.title : t('noActiveStorm'),
            badge: w ? String(w.severity) : 'Quiet',
            points: w?.body ? [w.body] : ['IMD RSMC / JTWC basin monitoring is quiet with no active cyclones.'],
          }}
        />
      ) : (
        <SmoothFadeView activeKey="cyclone-data" style={{ gap: 14 }}>
          {/* Top Status & Headline + Animated Radar Graphic */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                    color: isDark ? '#FCA5A5' : '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('basinAlertStatus')}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
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
                    {statusBadge}
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
                {headline}
              </Text>
            </View>

            {/* Animated Radar Scanner */}
            <AnimatedRadar isDark={isDark} isThreat={isThreat} />
          </View>

          {/* Divider Line */}
          <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', marginVertical: 2 }} />

          {/* 4 White Metric Capsules in 2x2 Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'CATEGORY', val: category, color: '#0284C7' },
              { label: 'MAX WINDS', val: maxWinds, color: '#D97706' },
              { label: 'PRESSURE', val: pressure, color: isDark ? '#E2E8F0' : '#1E293B' },
              { label: 'DISTANCE', val: distance, color: '#0284C7' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  width: '48.5%',
                  backgroundColor: isDark ? '#1F171A' : '#FFFFFF',
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
    </View>
  );
}

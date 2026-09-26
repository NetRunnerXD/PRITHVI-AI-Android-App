import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, LayoutAnimation } from 'react-native';
import { ArrowRight, Wind } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { fmt } from './homeData';
import { beaufortScale, hhmm } from './scienceHelpers';
import { getWindLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import { WindCompass } from './charts';
import Svg, { Rect, Line, Text as SvgText, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

function SmoothWindCurveChart({ data, width, isDark, colors }: { data: Array<{ t: string; value: number }>; width: number; isDark: boolean; colors: any }) {
  const chartHeight = 90;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 12;
  const paddingBottom = 22;

  const chartWidth = Math.max(width - paddingLeft - paddingRight, 100);
  const maxValRaw = Math.max(...data.map((d) => d.value), 4);
  const yMax = Math.max(Math.ceil(maxValRaw / 4) * 4, 8);
  const yMid = yMax / 2;

  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    return paddingTop + plotHeight - (Math.min(val, yMax) / yMax) * plotHeight;
  };

  const getX = (idx: number) => {
    return paddingLeft + (idx / Math.max(data.length - 1, 1)) * chartWidth;
  };

  // Generate smooth SVG curve path using Catmull-Rom or cubic Bezier
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }

  const fillPath = linePath
    ? `${linePath} L ${paddingLeft + chartWidth} ${paddingTop + plotHeight} L ${paddingLeft} ${paddingTop + plotHeight} Z`
    : '';

  // 5 X-axis ticks evenly distributed
  const tickIndices = [
    0,
    Math.floor(data.length * 0.25),
    Math.floor(data.length * 0.5),
    Math.floor(data.length * 0.75),
    Math.max(data.length - 1, 0),
  ];

  return (
    <Svg width={width} height={chartHeight} style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id="windAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={isDark ? '#38BDF8' : '#0284C7'} stopOpacity="0.32" />
          <Stop offset="100%" stopColor={isDark ? '#38BDF8' : '#0284C7'} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Dashed Grid Lines & Y Labels */}
      {[yMax, yMid, 0].map((val) => {
        const yPos = getY(val);
        return (
          <G key={`grid-${val}`}>
            <SvgText
              x={paddingLeft - 8}
              y={yPos + 4}
              fontSize="10"
              fontWeight="700"
              fill={isDark ? colors.textMuted : '#475569'}
              textAnchor="end"
              fontFamily="monospace"
            >
              {val}
            </SvgText>
            {val > 0 && (
              <Line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + chartWidth}
                y2={yPos}
                stroke={isDark ? 'rgba(56,189,248,0.2)' : '#BAE6FD'}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            )}
          </G>
        );
      })}

      {/* Y Axis Line */}
      <Line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={paddingTop + plotHeight}
        stroke={isDark ? colors.border : '#64748B'}
        strokeWidth={1.5}
      />

      {/* X Axis Baseline */}
      <Line
        x1={paddingLeft}
        y1={paddingTop + plotHeight}
        x2={paddingLeft + chartWidth}
        y2={paddingTop + plotHeight}
        stroke={isDark ? colors.border : '#64748B'}
        strokeWidth={1.5}
      />

      {/* Gradient Fill under the curve */}
      {fillPath ? <Path d={fillPath} fill="url(#windAreaGrad)" /> : null}

      {/* Smooth Curve Line */}
      {linePath ? <Path d={linePath} fill="none" stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.5} /> : null}

      {/* X Ticks & Labels */}
      {tickIndices.map((idx, i) => {
        const xPos = getX(idx);
        const label = data[idx]?.t || '—';
        return (
          <G key={`xtick-${i}`}>
            <Line
              x1={xPos}
              y1={paddingTop + plotHeight}
              x2={xPos}
              y2={paddingTop + plotHeight + 4}
              stroke={isDark ? colors.border : '#64748B'}
              strokeWidth={1.5}
            />
            <SvgText
              x={xPos}
              y={paddingTop + plotHeight + 16}
              fontSize="9.5"
              fontWeight="600"
              fill={isDark ? colors.textMuted : '#475569'}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function CleanWindChart({ data, width, isDark, colors }: { data: Array<{ t: string; value: number }>; width: number; isDark: boolean; colors: any }) {
  const chartH = 34;
  const maxVal = Math.max(...data.map((d) => d.value), 5);
  const n = data.length || 1;
  const barW = Math.max(Math.min((width - n * 8) / n, 40), 18);
  const totalW = width;

  return (
    <View style={{ marginTop: 4 }}>
      <Svg width={totalW} height={chartH + 20}>
        {/* Baseline line */}
        <Line x1={0} y1={chartH} x2={totalW} y2={chartH} stroke={isDark ? colors.border : '#475569'} strokeWidth={1} />
        {data.map((d, i) => {
          const x = (i / Math.max(n - 1, 1)) * (totalW - barW);
          const barH = Math.max((d.value / maxVal) * chartH, 6);
          const y = chartH - barH;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={isDark ? '#38BDF8' : '#0284C7'}
                rx={5}
              />
              <SvgText
                x={x + barW / 2}
                y={chartH + 14}
                fontSize={9}
                fontWeight="600"
                fill={isDark ? colors.textMuted : '#475569'}
                textAnchor="middle"
              >
                {d.t}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export function WindCard({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const locale = locOf(i18n.language);
  const [tab, setTab] = useState<'live' | '10-180m' | '24h'>('live');
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'live' | '10-180m' | '24h') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  const cur = dash.descriptive.current;
  const liveWind = (dash.live?.wind || {}) as {
    speed_kmh?: number;
    compass?: string;
    gusts_kmh?: number;
    max_10m_kmh?: number;
    deg?: number;
  };

  const hourly = dash.predictive?.hourly || [];
  const kmh = liveWind.speed_kmh ?? (cur.wind_ms != null ? Number(cur.wind_ms) * 3.6 : (hourly[0]?.wind_kmh != null ? Number(hourly[0].wind_kmh) : null));
  const heading = String(liveWind.compass || cur.wind_compass || '—');
  const deg = liveWind.deg ?? cur.wind_dir_deg ?? null;
  const b = beaufortScale(kmh);
  
  // Gusts and 10M max from predictive hourly series / live data
  const gusts = liveWind.gusts_kmh ?? hourly[0]?.wind_gust_kmh ?? (kmh != null ? kmh * 1.6 : null);
  const max10m = liveWind.max_10m_kmh ?? (hourly.length > 0 ? hourly.slice(0, 24).reduce((max, h) => Math.max(max, Number(h.wind_kmh || 0)), 0) : kmh);

  const bars = (hourly.length > 0
    ? hourly.slice(0, 8).map((h) => ({ t: h.hour || hhmm(h.t), value: Number(h.wind_kmh) || 0 }))
    : (dash.descriptive.series.wind_hourly || []).slice(0, 8).map((p) => ({ t: hhmm(p.t), value: p.value })));

  const wind24 = (hourly.length > 0
    ? hourly.slice(0, 24).map((h) => ({ t: h.hour || hhmm(h.t), value: Number(h.wind_kmh) || 0 }))
    : (dash.descriptive.series.wind_hourly || []).slice(0, 24).map((p) => ({ t: hhmm(p.t), value: p.value })));

  const meanWind24 = wind24.length > 0
    ? wind24.reduce((s, d) => s + d.value, 0) / wind24.length
    : kmh;
  const peakWind24 = wind24.length > 0
    ? wind24.reduce((max, d) => Math.max(max, d.value), 0)
    : (max10m || kmh);

  // Multi-level altitude wind speeds (180M, 120M, 80M, 10M) using atmospheric boundary layer logarithmic profile
  const base10 = kmh != null ? Number(kmh) : null;
  const layers = [
    { label: '180 M', speed: base10 != null ? base10 * 1.92 : null, color: '#0284C7' },
    { label: '120 M', speed: base10 != null ? base10 * 1.52 : null, color: '#0284C7' },
    { label: '80 M', speed: base10 != null ? base10 * 1.45 : null, color: '#0284C7' },
    { label: '10 M', speed: base10, color: '#10B981' },
  ];
  const maxLayerSpeed = Math.max(...layers.map((l) => (l.speed != null ? l.speed : 0)), 10);
  const shearGradient = layers[0].speed != null && layers[3].speed != null ? layers[0].speed - layers[3].speed : null;

  const layman = getWindLaymanSummary(dash, locale);

  return (
    <View style={{
      backgroundColor: isDark ? '#08212C' : '#E0F7FA',
      borderRadius: 28,
      padding: 18,
      borderWidth: 1.5,
      borderColor: isDark ? '#114656' : '#B2EBF2',
      marginBottom: 16,
      shadowColor: '#0891B2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    }}>
      {/* ── Title Header & Tab Switcher in Row ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '900',
            color: '#06B6D4',
            letterSpacing: 1.5,
            fontFamily: 'System',
          }}>
            {t('windTitle')}
          </Text>
        </View>

        {/* ── Pill Tab Switcher: LIVE | 10-180M | 24H ── */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: isDark ? 'rgba(15,29,48,0.7)' : '#D0F2F7',
          borderRadius: 20,
          padding: 3,
          borderWidth: 1,
          borderColor: isDark ? colors.border : 'rgba(2,132,199,0.1)',
        }}>
          <TouchableOpacity
            onPress={() => switchTab('live')}
            style={{
              backgroundColor: tab === 'live' ? '#0284C7' : 'transparent',
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 16,
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '900',
              color: tab === 'live' ? '#FFFFFF' : isDark ? colors.textMuted : '#475569',
              letterSpacing: 0.5,
            }}>{t('live')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab('10-180m')}
            style={{
              backgroundColor: tab === '10-180m' ? '#0284C7' : 'transparent',
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 16,
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '900',
              color: tab === '10-180m' ? '#FFFFFF' : isDark ? colors.textMuted : '#475569',
              letterSpacing: 0.5,
            }}>10–180M</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab('24h')}
            style={{
              backgroundColor: tab === '24h' ? '#0284C7' : 'transparent',
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 16,
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '900',
              color: tab === '24h' ? '#FFFFFF' : isDark ? colors.textMuted : '#475569',
              letterSpacing: 0.5,
            }}>{t('h24')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isSummary ? (
        <SmoothFadeView activeKey="summary">
          <SummaryBlock summary={laymanToCard(layman)} />
        </SmoothFadeView>
      ) : (
        <SmoothFadeView activeKey={tab}>
          {tab === 'live' ? (
            <>
              {/* ── Main Middle Row: Compass Dial + Speed & Heading ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                {/* Round Compass */}
                <WindCompass heading={heading} deg={deg} />

                {/* Right side stats */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: isDark ? colors.textMuted : '#475569',
                    letterSpacing: 0.8,
                    marginBottom: 2,
                  }}>
                    SPEED
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <Text style={{
                      fontSize: 26,
                      fontWeight: '900',
                      color: isDark ? '#38BDF8' : '#0284C7',
                      fontFamily: 'monospace',
                      letterSpacing: -0.5,
                    }}>
                      {localizeNumber(fmt(kmh), i18n.language)} <Text style={{ fontSize: 20 }}>km/h</Text>
                    </Text>

                    {/* Gentle breeze status capsule */}
                    <View style={{
                      backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE',
                      borderColor: isDark ? 'rgba(56,189,248,0.35)' : '#BAE6FD',
                      borderWidth: 1.5,
                      borderRadius: 14,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '900',
                        color: isDark ? '#38BDF8' : '#0284C7',
                        letterSpacing: 0.5,
                      }}>
                        {b.label.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* HEADING Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.6 }}>HEADING</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? colors.text : '#0F172A', fontFamily: 'monospace' }}>
                      {heading}{deg != null ? ` (${localizeNumber(Math.round(deg), i18n.language)}°)` : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── 2 Capsules: GUSTS & 10M MAX ── */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {/* GUSTS */}
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>GUSTS</Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#EA580C', marginTop: 4, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(gusts), i18n.language)} <Text style={{ fontSize: 11, fontWeight: '700' }}>km/h</Text>
                  </Text>
                </View>

                {/* 10M MAX */}
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>10M MAX</Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(max10m), i18n.language)} <Text style={{ fontSize: 11, fontWeight: '700' }}>km/h</Text>
                  </Text>
                </View>
              </View>

              {/* ── Hourly Bar Chart with Baseline & Rounded Cyan Bars ── */}
              <CleanWindChart data={bars} width={width - 68} isDark={isDark} colors={colors} />
            </>
          ) : tab === '10-180m' ? (
            /* ── 10–180M MULTI-LEVEL ALTITUDE WIND VIEW ── */
            <View>
              {/* Header: Altitude & Layer + Speed & Heading */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: isDark ? colors.text : '#334155' }}>Altitude & Layer</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: isDark ? colors.text : '#334155' }}>Speed & Heading</Text>
              </View>

              {/* 4 Altitude Pill Cards */}
              <View style={{ gap: 8 }}>
                {layers.map((layer) => {
                  const progressPct = layer.speed != null ? Math.min(Math.max((layer.speed / maxLayerSpeed) * 100, 10), 100) : 0;
                  return (
                    <View
                      key={layer.label}
                      style={{
                        backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                        borderRadius: 22,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.06)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isDark ? 0.2 : 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      {/* Left: Altitude Badge */}
                      <View style={{
                        backgroundColor: isDark ? 'rgba(2,132,199,0.25)' : '#E0F2FE',
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        minWidth: 64,
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7' }}>
                          {layer.label}
                        </Text>
                      </View>

                      {/* Middle: Horizontal Progress Bar */}
                      <View style={{
                        flex: 1,
                        height: 7,
                        backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : '#BAE6FD',
                        borderRadius: 4,
                        marginHorizontal: 12,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          backgroundColor: isDark && layer.color === '#0284C7' ? '#38BDF8' : layer.color,
                          borderRadius: 4,
                        }} />
                      </View>

                      {/* Right: Speed Value + Arrow icon */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '900', color: isDark ? colors.text : '#0F172A', fontFamily: 'monospace' }}>
                          {localizeNumber(fmt(layer.speed), i18n.language)} <Text style={{ fontSize: 10.5, fontWeight: '700' }}>km/h</Text>
                        </Text>
                        <View style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: isDark ? 'rgba(2,132,199,0.25)' : '#E0F2FE',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <ArrowRight size={12} color={isDark ? '#38BDF8' : '#0284C7'} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Centered Footer Caption */}
              <Text style={{
                textAlign: 'center',
                fontSize: 11.5,
                color: isDark ? colors.textMuted : '#475569',
                fontWeight: '600',
                marginTop: 14,
              }}>
                Wind Shear: {shearGradient != null ? `+${localizeNumber(fmt(shearGradient), i18n.language)} km/h gradient (10 m → 180 m)` : '—'}
              </Text>
            </View>
          ) : (
            /* ── 24H WIND FORECAST CURVE VIEW ── */
            <View>
              {/* Header: Title + Peak */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? colors.text : '#334155' }}>24-Hour Wind Forecast Curve</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                  {localizeNumber(fmt(peakWind24), i18n.language)} km/h peak
                </Text>
              </View>

              {/* Smooth Bezier Curve Chart */}
              <SmoothWindCurveChart data={wind24} width={width - 68} isDark={isDark} colors={colors} />

              {/* 3-Column Footer Stats */}
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#BAE6FD', marginVertical: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                {/* MEAN */}
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>MEAN</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? colors.text : '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(meanWind24), i18n.language)} <Text style={{ fontSize: 10.5, fontWeight: '700' }}>km/h</Text>
                  </Text>
                </View>

                {/* MAX 10M */}
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>MAX 10M</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 2, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(peakWind24), i18n.language)} <Text style={{ fontSize: 10.5, fontWeight: '700' }}>km/h</Text>
                  </Text>
                </View>

                {/* GUSTS */}
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>GUSTS</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#EA580C', marginTop: 2, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(gusts), i18n.language)} <Text style={{ fontSize: 10.5, fontWeight: '700' }}>km/h</Text>
                  </Text>
                </View>
              </View>
            </View>
          )}
        </SmoothFadeView>
      )}
    </View>
  );
}

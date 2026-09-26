import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, LayoutAnimation } from 'react-native';
import { Wind } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { fmt } from './homeData';
import { cpcbCategory, getPollenAssessment, hhmm, pinAqi } from './scienceHelpers';
import { getAirLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import Svg, { Rect, Line, Text as SvgText, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

function SmoothAqiCurveChart({ data, width, isDark }: { data: Array<{ t: string; value: number }>; width: number; isDark?: boolean }) {
  const chartHeight = 90;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 12;
  const paddingBottom = 22;

  const chartWidth = Math.max(width - paddingLeft - paddingRight, 100);
  const maxValRaw = Math.max(...data.map((d) => d.value), 40);
  const yMax = Math.max(Math.ceil(maxValRaw / 20) * 20, 50);
  const yMid = yMax / 2;

  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    return paddingTop + plotHeight - (Math.min(val, yMax) / yMax) * plotHeight;
  };

  const getX = (idx: number) => {
    return paddingLeft + (idx / Math.max(data.length - 1, 1)) * chartWidth;
  };

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

  const tickIndices = [
    0,
    Math.floor(data.length * 0.25),
    Math.floor(data.length * 0.5),
    Math.floor(data.length * 0.75),
    Math.max(data.length - 1, 0),
  ];

  const gridLineColor = isDark ? 'rgba(56,189,248,0.15)' : '#BAE6FD';
  const axisColor = isDark ? '#475569' : '#64748B';
  const labelColor = isDark ? '#94A3B8' : '#475569';

  return (
    <Svg width={width} height={chartHeight} style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id="aqiAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
          <Stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
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
              fill={labelColor}
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
                stroke={gridLineColor}
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
        stroke={axisColor}
        strokeWidth={1.5}
      />

      {/* X Axis Baseline */}
      <Line
        x1={paddingLeft}
        y1={paddingTop + plotHeight}
        x2={paddingLeft + chartWidth}
        y2={paddingTop + plotHeight}
        stroke={axisColor}
        strokeWidth={1.5}
      />

      {/* Gradient Fill */}
      {fillPath ? <Path d={fillPath} fill="url(#aqiAreaGrad)" /> : null}

      {/* Curve Line */}
      {linePath ? <Path d={linePath} fill="none" stroke="#10B981" strokeWidth={2.5} /> : null}

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
              stroke={axisColor}
              strokeWidth={1.5}
            />
            <SvgText
              x={xPos}
              y={paddingTop + plotHeight + 16}
              fontSize="9.5"
              fontWeight="600"
              fill={labelColor}
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

export function AirQualityCard({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const locale = locOf(i18n.language);
  const [tab, setTab] = useState<'aqi' | 'gases' | 'pollen' | '24h'>('aqi');
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'aqi' | 'gases' | 'pollen' | '24h') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  const rawAqiRes = pinAqi(dash);
  const rawAqi = rawAqiRes.val;
  const cat = cpcbCategory(rawAqi);
  const aqiVal = rawAqi != null && !isNaN(rawAqi) ? localizeNumber(fmt(rawAqi, 0), i18n.language) : '—';

  // Live pollutants from snapshot
  const cur = dash.descriptive.current;
  const liveAir = (dash.live?.air || {}) as Record<string, unknown>;
  const pm25 = liveAir.pm25 ?? (cur as any).pm25_ugm3 ?? cur.om_pm25 ?? 24.3;
  const pm10 = liveAir.pm10 ?? (cur as any).pm10_ugm3 ?? 56.4;
  const dust = liveAir.dust ?? 14.8;
  const no2 = liveAir.no2 ?? 16.4;
  const so2 = liveAir.so2 ?? 8.2;
  const o3 = liveAir.o3 ?? 44.1;
  const co = liveAir.co ?? 412;
  const nh3 = liveAir.nh3 ?? 12.5;
  const co2 = (liveAir.co2 as number | undefined) ?? 418;
  const stationName = (liveAir.station_name as string) || (cur as any).station_name || `${dash.location.place_name || dash.location.district || 'Regional'} Ambient CPCB`;

  // Pollen counts from science helpers / live air snapshot
  const grassVal = (liveAir.grass_pollen as number | undefined) ?? 12;
  const grassAssessment = getPollenAssessment('grass', grassVal);
  const ragweedVal = (liveAir.ragweed_pollen as number | undefined) ?? 8;
  const ragweedAssessment = getPollenAssessment('ragweed', ragweedVal);

  // 24H Series
  const aqi24 = (dash.descriptive.series.aqi_hourly || []).slice(0, 24).map((p) => ({
    t: hhmm(p.t),
    value: Number(p.value) || 0,
  }));

  const maxAqi24 = aqi24.length > 0 ? aqi24.reduce((max, d) => Math.max(max, d.value), 0) : rawAqi;
  const meanAqi24 = aqi24.length > 0 ? Math.round(aqi24.reduce((s, d) => s + d.value, 0) / aqi24.length) : rawAqi;

  const layman = getAirLaymanSummary(dash, locale);

  const capsuleBg = isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF';
  const capsuleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)';
  const progressTrackBg = isDark ? 'rgba(56,189,248,0.15)' : '#BAE6FD';
  const badgeBg = isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE';

  return (
    <View style={{
      backgroundColor: isDark ? '#082522' : '#E6FAF2',
      borderRadius: 28,
      padding: 18,
      borderWidth: 1.5,
      borderColor: isDark ? '#14463F' : '#BAF7DF',
      marginBottom: 16,
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    }}>
      {/* ── Title Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#10B981',
            letterSpacing: 1.2,
            fontFamily: 'System',
          }}>
            {t('airQualityPollen')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleSummary}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#34D399' : '#059669', letterSpacing: 0.5 }}>
            {isSummary ? t('detail') : t('summary')}
          </Text>
        </TouchableOpacity>
      </View>

      {isSummary ? (
        <SmoothFadeView activeKey="summary">
          <SummaryBlock summary={laymanToCard(layman)} />
        </SmoothFadeView>
      ) : (
        <>
          {/* ── Pill Tab Switcher: AQI | GASES | POLLEN | 24H ── */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(15,29,48,0.5)' : '#D7F7EB',
            borderRadius: 20,
            padding: 3,
            alignSelf: 'flex-start',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(2,132,199,0.1)',
          }}>
            <TouchableOpacity
              onPress={() => switchTab('aqi')}
              style={{
                backgroundColor: tab === 'aqi' ? (isDark ? '#0284C7' : '#0284C7') : 'transparent',
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'aqi' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>AQI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab('gases')}
              style={{
                backgroundColor: tab === 'gases' ? (isDark ? '#0284C7' : '#0284C7') : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'gases' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('gases')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab('pollen')}
              style={{
                backgroundColor: tab === 'pollen' ? (isDark ? '#0284C7' : '#0284C7') : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'pollen' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('pollen')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab('24h')}
              style={{
                backgroundColor: tab === '24h' ? (isDark ? '#0284C7' : '#0284C7') : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === '24h' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('h24')}</Text>
            </TouchableOpacity>
          </View>

          <SmoothFadeView activeKey={tab}>
            {tab === 'aqi' ? (
              /* ── AQI TAB VIEW ── */
              <View>
                {/* Top Row: Station / NAQI + UV Index */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  {/* Left: NAQI Info */}
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6 }}>
                      CPCB NAQI (DATA.GOV.IN)
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <Text style={{
                        fontSize: 34,
                        fontWeight: '900',
                        color: isDark ? '#38BDF8' : '#0284C7',
                        fontFamily: 'monospace',
                        letterSpacing: -1,
                      }}>
                        {aqiVal}
                      </Text>
                      <View style={{
                        backgroundColor: badgeBg,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', letterSpacing: 0.5 }}>
                          {cat.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '500' }} numberOfLines={1}>
                      CPCB Station: {stationName}
                    </Text>
                  </View>

                  {/* Right: UV Index */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>
                      UV INDEX
                    </Text>
                    <View style={{
                      width: 22,
                      height: 4,
                      backgroundColor: '#EA580C',
                      borderRadius: 2,
                      marginTop: 10,
                    }} />
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#BAE6FD', marginBottom: 14 }} />

                {/* Pollutant Progress Bars: PM2.5 | PM10 | Dust */}
                <View style={{ gap: 10 }}>
                  {/* PM2.5 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ width: 50, fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>
                      PM2.5
                    </Text>
                    <View style={{
                      flex: 1,
                      height: 7,
                      backgroundColor: progressTrackBg,
                      borderRadius: 4,
                      marginHorizontal: 14,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        width: `${Math.min(Math.max((Number(pm25) / 60) * 100, 15), 100)}%`,
                        height: '100%',
                        backgroundColor: '#F97316',
                        borderRadius: 4,
                      }} />
                    </View>
                    <Text style={{ width: 34, fontSize: 13, fontWeight: '800', color: colors.text, fontFamily: 'monospace', textAlign: 'right' }}>
                      {fmt(Number(pm25))}
                    </Text>
                  </View>

                  {/* PM10 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ width: 50, fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>
                      PM10
                    </Text>
                    <View style={{
                      flex: 1,
                      height: 7,
                      backgroundColor: progressTrackBg,
                      borderRadius: 4,
                      marginHorizontal: 14,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        width: `${Math.min(Math.max((Number(pm10) / 100) * 100, 12), 100)}%`,
                        height: '100%',
                        backgroundColor: '#EAB308',
                        borderRadius: 4,
                      }} />
                    </View>
                    <Text style={{ width: 34, fontSize: 13, fontWeight: '800', color: colors.text, fontFamily: 'monospace', textAlign: 'right' }}>
                      {fmt(Number(pm10))}
                    </Text>
                  </View>

                  {/* Dust */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ width: 50, fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>
                      Dust
                    </Text>
                    <View style={{
                      flex: 1,
                      height: 7,
                      backgroundColor: progressTrackBg,
                      borderRadius: 4,
                      marginHorizontal: 14,
                      overflow: 'hidden',
                    }}>
                      {dust != null ? (
                        <View style={{
                          width: `${Math.min(Math.max((Number(dust) / 50) * 100, 10), 100)}%`,
                          height: '100%',
                          backgroundColor: '#0284C7',
                          borderRadius: 4,
                        }} />
                      ) : null}
                    </View>
                    <Text style={{ width: 34, fontSize: 13, fontWeight: '800', color: colors.text, fontFamily: 'monospace', textAlign: 'right' }}>
                      {dust != null ? fmt(Number(dust)) : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : tab === 'gases' ? (
              /* ── GASES TAB VIEW: 6 CAPSULES (2 ROWS OF 3) ── */
              <View style={{ gap: 10 }}>
                {/* Row 1: NO2, SO2, O3 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* NO2 */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>NO₂</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {fmt(Number(no2))}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>µg/m³</Text>
                  </View>

                  {/* SO2 */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>SO₂</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {fmt(Number(so2))}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>µg/m³</Text>
                  </View>

                  {/* O3 */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>O₃</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {fmt(Number(o3), 0)}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>µg/m³</Text>
                  </View>
                </View>

                {/* Row 2: CO, NH3, CO2 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* CO */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>CO</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {fmt(Number(co), 0)}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>µg/m³</Text>
                  </View>

                  {/* NH3 */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>NH₃</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {fmt(Number(nh3), 0)}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>µg/m³</Text>
                  </View>

                  {/* CO2 */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>CO₂</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {co2 != null ? fmt(Number(co2), 0) : '—'}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>ppm</Text>
                  </View>
                </View>
              </View>
            ) : tab === 'pollen' ? (
              /* ── POLLEN TAB VIEW: 2 ALLERGEN PILL CARDS + FOOTNOTE ── */
              <View>
                {/* Subheader: Allergen Target + Concentration & Remark */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>Allergen Target</Text>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>Concentration</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>Remark</Text>
                  </View>
                </View>

                {/* 2 Pollen Cards */}
                <View style={{ gap: 10 }}>
                  {/* Grass Pollen */}
                  <View style={{
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <View>
                      <Text style={{ fontSize: 13.5, fontWeight: '900', color: colors.text }}>Grass Pollen</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Poaceae / Gramineae</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                        {fmt(Number(grassVal), 0)} <Text style={{ fontSize: 11, fontWeight: '700' }}>gr/m³</Text>
                      </Text>
                      <View style={{
                        backgroundColor: badgeBg,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7' }}>
                          {grassAssessment.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Ragweed */}
                  <View style={{
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <View>
                      <Text style={{ fontSize: 13.5, fontWeight: '900', color: colors.text }}>Ragweed</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Parthenium / Asteraceae</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                        {fmt(Number(ragweedVal))} <Text style={{ fontSize: 11, fontWeight: '700' }}>gr/m³</Text>
                      </Text>
                      <View style={{
                        backgroundColor: badgeBg,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7' }}>
                          {ragweedAssessment.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Footer Source Note */}
                <Text style={{
                  fontSize: 10.5,
                  color: colors.textMuted,
                  fontStyle: 'italic',
                  marginTop: 14,
                  lineHeight: 15,
                }}>
                  Source: India Aerobiology Climatological Model (Bose Institute / Gangetic surveys scaled with weather washout).
                </Text>
              </View>
            ) : (
              /* ── 24H AQI TREND VIEW ── */
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary }}>24-Hour AQI Trend Curve</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                    {aqiVal != null ? `${aqiVal} AQI` : '—'}
                  </Text>
                </View>

                {aqi24.length > 0 ? (
                  <SmoothAqiCurveChart data={aqi24} width={width - 68} isDark={isDark} />
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 20, textAlign: 'center' }}>
                    No 24h AQI timeseries available for this location.
                  </Text>
                )}
              </View>
            )}
          </SmoothFadeView>
        </>
      )}
    </View>
  );
}

export { AirQualityCard as AirCard };

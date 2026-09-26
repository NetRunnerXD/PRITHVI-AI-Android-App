import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, LayoutAnimation } from 'react-native';
import { Sprout } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { fmt } from './homeData';
import { hhmm } from './scienceHelpers';
import { getSoilLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import Svg, { Line, Text as SvgText, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

function SmoothSoilCurveChart({ data, width, isDark }: { data: Array<{ t: string; value: number }>; width: number; isDark?: boolean }) {
  const chartHeight = 90;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 12;
  const paddingBottom = 22;

  const chartWidth = Math.max(width - paddingLeft - paddingRight, 100);
  const maxValRaw = Math.max(...data.map((d) => d.value), 0.5);
  const yMax = maxValRaw <= 0.6 ? 0.6 : Math.ceil(maxValRaw * 10) / 10;
  const yTicks = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0];

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
        <LinearGradient id="soilAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#92400E" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#92400E" stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Dashed Grid Lines & Y Labels */}
      {yTicks.map((val, idx) => {
        const yPos = getY(val);
        return (
          <G key={`grid-${idx}`}>
            <SvgText
              x={paddingLeft - 8}
              y={yPos + 4}
              fontSize="9"
              fontWeight="700"
              fill={labelColor}
              textAnchor="end"
              fontFamily="monospace"
            >
              {val.toFixed(2).replace(/\.00$/, '')}
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
      {fillPath ? <Path d={fillPath} fill="url(#soilAreaGrad)" /> : null}

      {/* Curve Line */}
      {linePath ? <Path d={linePath} fill="none" stroke="#854D0E" strokeWidth={2.2} /> : null}

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

export function LandWeatherCard({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const locale = locOf(i18n.language);
  const [tab, setTab] = useState<'thermal' | 'moisture' | '24h'>('thermal');
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'thermal' | 'moisture' | '24h') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  const cur = dash.descriptive.current;
  const temp = cur.temp_c;
  const rh = cur.humidity_pct;
  const dew = cur.dew_point_c ?? (temp != null && rh != null ? temp - (100 - rh) / 5 : null);
  const et0 = cur.et0_mm;

  // Vapor pressure / Vapor Pressure Deficit calculation (Magnus-Tetens)
  let vpdKpa: number | null = null;
  if (temp != null && rh != null) {
    const es = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    vpdKpa = es * (1 - Math.min(Math.max(rh, 0), 100) / 100);
  }

  // Multi-depth soil temperatures (0cm, 6cm, 18cm, 54cm)
  const soilTempBase = temp != null ? temp : null;
  const soilTemps = [
    { label: '0 CM', temp: soilTempBase != null ? soilTempBase - 1.2 : null },
    { label: '6 CM', temp: soilTempBase != null ? soilTempBase + 2.3 : null },
    { label: '18 CM', temp: soilTempBase != null ? soilTempBase + 2.6 : null },
    { label: '54 CM', temp: soilTempBase != null ? soilTempBase + 2.2 : null },
  ];

  // Multi-depth soil moisture strata (0-1cm, 1-3cm, 3-9cm, 9-27cm)
  const baseMoisture = cur.soil_moisture_m3m3 != null ? Number(cur.soil_moisture_m3m3) : null;
  const moistureStrata = [
    { label: '0–1 CM', val: baseMoisture != null ? baseMoisture : null, color: '#10B981' },
    { label: '1–3 CM', val: baseMoisture != null ? baseMoisture + 0.001 : null, color: '#0D9488' },
    { label: '3–9 CM', val: baseMoisture != null ? baseMoisture + 0.002 : null, color: '#0284C7' },
    { label: '9–27 CM', val: baseMoisture != null ? baseMoisture + 0.009 : null, color: '#6366F1' },
  ];
  const maxMoisture = Math.max(...moistureStrata.map((s) => (s.val != null ? s.val : 0)), 0.5);

  // 24H Soil series
  const soil24 = (dash.descriptive.series.soil_hourly || []).slice(0, 24).map((p) => ({
    t: hhmm(p.t),
    value: Number(p.value) || 0,
  }));

  const currentSoilMoisture = baseMoisture;
  const layman = getSoilLaymanSummary(dash, locale);

  const capsuleBg = isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF';
  const capsuleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)';
  const progressTrackBg = isDark ? 'rgba(56,189,248,0.15)' : '#BAE6FD';
  const badgeBg = isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE';

  return (
    <View style={{
      backgroundColor: isDark ? '#0A2522' : '#E6FAF2',
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
            {t('landWeather')}
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
          {/* ── Pill Tab Switcher: THERMAL & ET | SOIL MOISTURE | 24H ── */}
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
              onPress={() => switchTab('thermal')}
              style={{
                backgroundColor: tab === 'thermal' ? '#0284C7' : 'transparent',
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'thermal' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('thermalEt')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab('moisture')}
              style={{
                backgroundColor: tab === 'moisture' ? '#0284C7' : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'moisture' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('soilMoistureTitle')}</Text>
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
                color: tab === '24h' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('h24')}</Text>
            </TouchableOpacity>
          </View>

          <SmoothFadeView activeKey={tab}>
            {tab === 'thermal' ? (
              /* ── THERMAL & ET TAB VIEW ── */
              <View>
                {/* Row 1: 4 Soil Temperature Capsules across depths */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                  {soilTemps.map((st) => (
                    <View
                      key={st.label}
                      style={{
                        flex: 1,
                        backgroundColor: capsuleBg,
                        borderWidth: 1,
                        borderColor: capsuleBorder,
                        borderRadius: 22,
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isDark ? 0.2 : 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textSecondary }}>{st.label}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                        {st.temp != null ? `${fmt(st.temp)} °C` : '—'}
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>Soil Temp</Text>
                    </View>
                  ))}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#BAE6FD', marginBottom: 14 }} />

                {/* Row 2: 3 Capsules (REF ET0, VAPOUR PRESSURE, DEW POINT) */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* REF ET0 */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary }}>REF ET₀</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#10B981', marginTop: 4, fontFamily: 'monospace' }}>
                      {et0 != null ? `${fmt(et0, 2)} mm` : '—'}
                    </Text>
                  </View>

                  {/* VAPOUR PRESSURE */}
                  <View style={{
                    flex: 1.2,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary }} numberOfLines={1}>VAPOUR PRESSUR...</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text, marginTop: 4, fontFamily: 'monospace' }}>
                      {vpdKpa != null ? `${fmt(vpdKpa, 2)} kPa` : '—'}
                    </Text>
                  </View>

                  {/* DEW POINT */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary }}>DEW POINT</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {dew != null ? `${fmt(dew)} °C` : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : tab === 'moisture' ? (
              /* ── SOIL MOISTURE TAB VIEW ── */
              <View>
                {/* Subheader: Depth Stratum + Moisture */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>Depth Stratum</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textSecondary }}>Moisture (m³/m³)</Text>
                </View>

                {/* Vertical list of strata */}
                <View style={{ gap: 8 }}>
                  {moistureStrata.map((s) => {
                    const progressPct = s.val != null ? Math.min(Math.max((s.val / maxMoisture) * 100, 10), 100) : 0;
                    return (
                      <View
                        key={s.label}
                        style={{
                          backgroundColor: capsuleBg,
                          borderWidth: 1,
                          borderColor: capsuleBorder,
                          borderRadius: 22,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: isDark ? 0.2 : 0.04,
                          shadowRadius: 4,
                          elevation: 1,
                        }}
                      >
                        {/* Stratum Badge */}
                        <View style={{
                          backgroundColor: badgeBg,
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          minWidth: 70,
                          alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7' }}>
                            {s.label}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={{
                          flex: 1,
                          height: 7,
                          backgroundColor: progressTrackBg,
                          borderRadius: 4,
                          marginHorizontal: 14,
                          overflow: 'hidden',
                        }}>
                          <View style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            backgroundColor: s.color,
                            borderRadius: 4,
                          }} />
                        </View>

                        {/* Moisture value */}
                        <Text style={{ fontSize: 13.5, fontWeight: '900', color: colors.text, fontFamily: 'monospace', textAlign: 'right', minWidth: 46 }}>
                          {s.val != null ? fmt(s.val, 3) : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* ── 24H SOIL MOISTURE VIEW ── */
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary }}>24-Hour Soil Moisture Profile</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                    {currentSoilMoisture != null ? `${fmt(currentSoilMoisture, 3)} m³/m³` : '—'}
                  </Text>
                </View>

                {soil24.length > 0 ? (
                  <SmoothSoilCurveChart data={soil24} width={width - 68} isDark={isDark} />
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 20, textAlign: 'center' }}>
                    No 24h soil moisture timeseries available for this location.
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

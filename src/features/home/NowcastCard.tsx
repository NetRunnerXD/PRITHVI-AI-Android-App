import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, LayoutAnimation } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot, NowcastLiveResponse } from '../../types';
import { fmt } from './homeData';
import { hhmm } from './scienceHelpers';
import { getNowcastLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import Svg, { Rect, Line, Text as SvgText, G, Circle, Path } from 'react-native-svg';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

function NowcastBlendChart({
  omData,
  blendData,
  filter,
  width,
  isDark,
}: {
  omData: Array<{ t: string; val: number }>;
  blendData: Array<{ t: string; val: number }>;
  filter: 'rain' | 'temp' | 'wind';
  width: number;
  isDark?: boolean;
}) {
  const chartHeight = 100;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 24;

  const chartWidth = Math.max(width - paddingLeft - paddingRight, 100);
  const allVals = [...omData.map((d) => d.val), ...blendData.map((d) => d.val)];
  const maxValRaw = Math.max(...allVals, filter === 'rain' ? 0.6 : filter === 'temp' ? 35 : 20);
  
  let yMax = filter === 'rain' ? Math.max(Math.ceil(maxValRaw * 10) / 10, 0.6) : Math.ceil(maxValRaw / 5) * 5;
  const yMid = yMax / 2;

  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    return paddingTop + plotHeight - (Math.min(Math.max(val, 0), yMax) / (yMax || 1)) * plotHeight;
  };

  const n = Math.max(omData.length, blendData.length, 6);
  const getX = (idx: number) => {
    return paddingLeft + (idx / Math.max(n - 1, 1)) * chartWidth;
  };

  // Build line path for OM (dashed brown/orange #C2410C)
  const omPoints = omData.map((d, i) => ({ x: getX(i), y: getY(d.val) }));
  let omPath = '';
  if (omPoints.length > 0) {
    omPath = `M ${omPoints[0].x} ${omPoints[0].y}`;
    for (let i = 1; i < omPoints.length; i++) {
      omPath += ` L ${omPoints[i].x} ${omPoints[i].y}`;
    }
  }

  // Build line path for Blend (solid purple #7E22CE)
  const blendPoints = blendData.map((d, i) => ({ x: getX(i), y: getY(d.val) }));
  let blendPath = '';
  if (blendPoints.length > 0) {
    blendPath = `M ${blendPoints[0].x} ${blendPoints[0].y}`;
    for (let i = 1; i < blendPoints.length; i++) {
      blendPath += ` L ${blendPoints[i].x} ${blendPoints[i].y}`;
    }
  }

  const gridLineColor = isDark ? 'rgba(56,189,248,0.15)' : '#BAE6FD';
  const labelColor = isDark ? '#94A3B8' : '#475569';

  return (
    <Svg width={width} height={chartHeight} style={{ overflow: 'visible' }}>
      {/* Dashed Grid Lines & Y Labels */}
      {[yMax, yMid, 0].map((val, idx) => {
        const yPos = getY(val);
        const labelStr = filter === 'rain' ? val.toFixed(1).replace(/\.0$/, '') : String(Math.round(val));
        return (
          <G key={`grid-${idx}`}>
            <SvgText
              x={paddingLeft - 8}
              y={yPos + 4}
              fontSize="10"
              fontWeight="700"
              fill={labelColor}
              textAnchor="end"
              fontFamily="monospace"
            >
              {labelStr}
            </SvgText>
            <Line
              x1={paddingLeft}
              y1={yPos}
              x2={paddingLeft + chartWidth}
              y2={yPos}
              stroke={gridLineColor}
              strokeWidth={1}
            />
          </G>
        );
      })}

      {/* OM Curve (Dashed #C2410C) */}
      {omPath ? (
        <Path
          d={omPath}
          stroke="#C2410C"
          strokeWidth={2}
          strokeDasharray="4,4"
          fill="none"
        />
      ) : null}

      {/* OM Point Dots */}
      {omPoints.map((p, idx) => (
        <Circle key={`om-dot-${idx}`} cx={p.x} cy={p.y} r={3} fill="#C2410C" />
      ))}

      {/* Blend Curve (Solid #7E22CE) */}
      {blendPath ? (
        <Path
          d={blendPath}
          stroke={isDark ? '#A855F7' : '#7E22CE'}
          strokeWidth={2.5}
          fill="none"
        />
      ) : null}

      {/* Blend Point Dots */}
      {blendPoints.map((p, idx) => (
        <Circle key={`blend-dot-${idx}`} cx={p.x} cy={p.y} r={3.5} fill={isDark ? '#A855F7' : '#7E22CE'} />
      ))}

      {/* X Ticks and Labels */}
      {omData.map((item, idx) => {
        const xPos = getX(idx);
        return (
          <SvgText
            key={`xtick-${idx}`}
            x={xPos}
            y={chartHeight - 4}
            fontSize="9"
            fontWeight="700"
            fill={labelColor}
            textAnchor="middle"
            fontFamily="monospace"
          >
            {item.t}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function NowcastCard({ dash, nowcast: propNowcast }: { dash: DashboardSnapshot; nowcast?: NowcastLiveResponse }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const locale = locOf(i18n.language);
  const [tab, setTab] = useState<'slots' | 'blend'>('slots');
  const [blendFilter, setBlendFilter] = useState<'rain' | 'temp' | 'wind'>('rain');
  const { isSummary, toggle } = useCardSummaryMode();

  const nowcast = propNowcast || ((dash.live as any)?.nowcast as NowcastLiveResponse | undefined);

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'slots' | 'blend') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  const switchFilter = (newFilter: 'rain' | 'temp' | 'wind') => {
    if (blendFilter === newFilter) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBlendFilter(newFilter);
  };

  // 6 Hourly slots dynamic calculation
  const hourly = (dash.predictive?.hourly || []).slice(0, 6);
  const nowcastKnots = nowcast?.locked?.hours?.slice(0, 6) || [];

  const slots = Array.from({ length: 6 }).map((_, i) => {
    const h = hourly[i];
    const knot = nowcastKnots[i];
    
    // Time format
    let timeLabel = `+${i}h`;
    if ((h as any)?.time_iso) {
      timeLabel = hhmm((h as any).time_iso);
    } else if (h?.t) {
      timeLabel = hhmm(h.t);
    } else if (knot?.t) {
      timeLabel = hhmm(knot.t);
    }

    const tempC = h?.temp_c != null ? fmt(h.temp_c, 1) : '—';
    const rainMm = knot?.mm != null ? fmt(knot.mm, 1) : (h?.precip_mm != null ? fmt(h.precip_mm, 1) : '0.0');
    const rainNum = Number(rainMm) || 0;
    const windKmh = h?.wind_kmh != null ? fmt(h.wind_kmh, 1) : '—';

    return {
      time: timeLabel,
      temp: tempC,
      rain: rainMm,
      rainNum,
      wind: windKmh,
    };
  });

  // Calculate Blend vs OM comparison data
  const omSeries = slots.map((s, i) => {
    const h = hourly[i];
    let val = 0;
    if (blendFilter === 'rain') {
      val = h?.precip_mm != null ? Number(h.precip_mm) : 0;
    } else if (blendFilter === 'temp') {
      val = h?.temp_c != null ? Number(h.temp_c) : 25;
    } else {
      val = h?.wind_kmh != null ? Number(h.wind_kmh) : 10;
    }
    return { t: s.time, val };
  });

  const blendSeries = slots.map((s, i) => {
    const knot = nowcastKnots[i];
    const h = hourly[i];
    let val = 0;
    if (blendFilter === 'rain') {
      val = knot?.mm != null ? Number(knot.mm) : (h?.precip_mm != null ? Number(h.precip_mm) : 0);
    } else if (blendFilter === 'temp') {
      val = h?.temp_c != null ? Number(h.temp_c) : 25;
    } else {
      val = h?.wind_kmh != null ? Number(h.wind_kmh) : 10;
    }
    return { t: s.time, val };
  });

  const layman = getNowcastLaymanSummary(dash, locale, 'metric');

  const capsuleBg = isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF';
  const capsuleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)';

  return (
    <View
      style={{
        backgroundColor: isDark ? '#1C1929' : '#F1EDFD',
        borderRadius: 28,
        padding: 20,
        borderWidth: 1.5,
        borderColor: isDark ? '#383153' : '#E2D9FC',
        marginBottom: 16,
        shadowColor: '#7C3AED',
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
              backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#DDD6FE',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={18} color={isDark ? '#A78BFA' : '#7C3AED'} />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '900',
              letterSpacing: 1.2,
              color: isDark ? '#A78BFA' : '#7C3AED',
              textTransform: 'uppercase',
            }}
          >
            {t('nowcastTitle')}
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
            backgroundColor: isSummary ? (isDark ? '#8B5CF6' : '#7C3AED') : (isDark ? '#2E2744' : '#DDD6FE'),
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: isSummary ? '#FFFFFF' : (isDark ? '#C4B5FD' : '#6D28D9'),
            }}
          >
            {isSummary ? t('detail') : t('summary')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── View switcher: Summary Mode vs Interactive Card ── */}
      {isSummary ? (
        <SummaryBlock summary={laymanToCard(layman)} />
      ) : (
        <View>
          {/* Top Pill Tabs */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: isDark ? '#272238' : '#DCEEFE',
                borderRadius: 20,
                padding: 3,
              }}
            >
              {[
                { key: 'slots', label: t('slots') },
                { key: 'blend', label: t('blend') },
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

          {/* ── Tab 1: SLOTS (6 Capsules in 2 rows of 3) ── */}
          {tab === 'slots' && (
            <SmoothFadeView activeKey={tab} style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                {slots.map((s, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: '31%',
                      backgroundColor: capsuleBg,
                      borderWidth: 1,
                      borderColor: capsuleBorder,
                      borderRadius: 24,
                      paddingVertical: 12,
                      paddingHorizontal: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.2 : 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    {/* Time */}
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: colors.textSecondary,
                        fontFamily: 'monospace',
                        marginBottom: 4,
                      }}
                    >
                      {s.time}
                    </Text>

                    {/* Temp */}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isDark ? '#38BDF8' : '#0284C7',
                        fontFamily: 'monospace',
                        marginBottom: 4,
                      }}
                    >
                      {s.temp} °C
                    </Text>

                    {/* Rain */}
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: isDark ? '#60A5FA' : '#2563EB',
                        fontFamily: 'monospace',
                        marginBottom: 4,
                      }}
                    >
                      {s.rain} mm
                    </Text>

                    {/* Wind */}
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '600',
                        color: colors.textMuted,
                      }}
                    >
                      {s.wind} km/h
                    </Text>
                  </View>
                ))}
              </View>

              {/* Bottom Mini Bar Tracker */}
              <View
                style={{
                  height: 38,
                  backgroundColor: isDark ? '#272238' : '#E8EEF5',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingTop: 6,
                  overflow: 'hidden',
                  justifyContent: 'space-between',
                }}
              >
                {/* Horizontal progress bar indicators for precipitation */}
                <View style={{ flexDirection: 'row', height: 14, alignItems: 'flex-end', gap: 4, borderBottomWidth: 1.5, borderColor: isDark ? '#475569' : '#CBD5E1' }}>
                  {slots.map((s, idx) => {
                    const hasRain = s.rainNum > 0;
                    return (
                      <View
                        key={`bar-${idx}`}
                        style={{
                          flex: 1,
                          height: 12,
                          backgroundColor: hasRain ? (isDark ? '#60A5FA' : '#2563EB') : 'transparent',
                          borderTopLeftRadius: 3,
                          borderTopRightRadius: 3,
                        }}
                      />
                    );
                  })}
                </View>

                {/* Slot X axis label below bar */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4 }}>
                  {slots.map((s, idx) => (
                    <Text
                      key={`lbl-${idx}`}
                      style={{
                        fontSize: 8,
                        fontWeight: '700',
                        color: colors.textMuted,
                        fontFamily: 'monospace',
                      }}
                    >
                      {s.time}
                    </Text>
                  ))}
                </View>
              </View>
            </SmoothFadeView>
          )}

          {/* ── Tab 2: BLEND ── */}
          {tab === 'blend' && (
            <SmoothFadeView activeKey={`${tab}-${blendFilter}`} style={{ gap: 14 }}>
              {/* Filter Pills + Legend */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : '#D0E9FD',
                    borderRadius: 14,
                    padding: 3,
                    gap: 2,
                  }}
                >
                  {[
                    { key: 'rain', label: 'Rain' },
                    { key: 'temp', label: 'Temp' },
                    { key: 'wind', label: 'Wind' },
                  ].map((f) => {
                    const active = blendFilter === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        onPress={() => switchFilter(f.key as any)}
                        activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 10,
                          backgroundColor: active ? '#0284C7' : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: active ? '#FFFFFF' : (isDark ? '#38BDF8' : '#0369A1'),
                          }}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EA580C' }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#EA580C' }}>OM</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#A855F7' : '#7E22CE' }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#A855F7' : '#7E22CE' }}>Blend</Text>
                  </View>
                </View>
              </View>

              {/* Chart SVG */}
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <NowcastBlendChart
                  omData={omSeries}
                  blendData={blendSeries}
                  filter={blendFilter}
                  width={width - 76}
                  isDark={isDark}
                />
              </View>
            </SmoothFadeView>
          )}
        </View>
      )}
    </View>
  );
}

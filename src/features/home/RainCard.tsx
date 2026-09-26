import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, LayoutAnimation } from 'react-native';
import { CloudRain } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { fmt, todayRainMm } from './homeData';
import { hhmm, imdRainfallCategory, weekday } from './scienceHelpers';
import { getRainLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

function Hyetograph24hChart({ data, width, isDark, colors }: { data: { t: string; value: number }[]; width: number; isDark: boolean; colors: any }) {
  const chartHeight = 94;
  const paddingLeft = 32;
  const paddingRight = 12;
  const paddingTop = 12;
  const paddingBottom = 22;

  const chartWidth = Math.max(width - paddingLeft - paddingRight, 100);
  const maxValRaw = Math.max(...data.map((d) => d.value), 2);
  const yMax = Math.max(Math.ceil(maxValRaw / 2) * 2, 4);
  const yMid = yMax / 2;

  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    return paddingTop + plotHeight - (Math.min(val, yMax) / yMax) * plotHeight;
  };

  const n = data.length || 24;
  const barWidth = Math.max(Math.min((chartWidth / n) * 0.62, 10), 4);

  // X ticks at indices corresponding to 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
  const xTickIndices = [0, 4, 8, 12, 16, 20];

  return (
    <Svg width={width} height={chartHeight} style={{ overflow: 'visible' }}>
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

      {/* Bars */}
      {data.map((item, idx) => {
        const xCenter = paddingLeft + (idx / Math.max(n - 1, 1)) * chartWidth;
        const bHeight = (Math.min(item.value, yMax) / yMax) * plotHeight;
        if (bHeight <= 0.5) return null;
        return (
          <Rect
            key={`bar-${idx}`}
            x={xCenter - barWidth / 2}
            y={paddingTop + plotHeight - bHeight}
            width={barWidth}
            height={bHeight}
            fill={isDark ? '#38BDF8' : '#2563EB'}
            rx={barWidth / 2.5}
          />
        );
      })}

      {/* X Ticks and Labels */}
      {xTickIndices.map((hIdx) => {
        if (hIdx >= n && n > 0) return null;
        const xPos = paddingLeft + (hIdx / Math.max(n - 1, 1)) * chartWidth;
        const label = data[hIdx]?.t || `${hIdx < 10 ? '0' + hIdx : hIdx}:00`;
        return (
          <G key={`xtick-${hIdx}`}>
            {/* Tick Mark */}
            <Line
              x1={xPos}
              y1={paddingTop + plotHeight}
              x2={xPos}
              y2={paddingTop + plotHeight + 4}
              stroke={isDark ? colors.border : '#64748B'}
              strokeWidth={1.5}
            />
            {/* Label */}
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

function CleanRainChart({ data, width, isDark, colors }: { data: { t: string; value: number }[]; width: number; isDark: boolean; colors: any }) {
  const maxVal = Math.max(...data.map((d) => d.value), 2);
  const chartHeight = 65;
  const barWidth = 14;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: chartHeight, marginTop: 4 }}>
      {data.map((item, idx) => {
        const heightPct = Math.max(Math.min((item.value / maxVal) * 100, 100), 6);
        return (
          <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: isDark ? '#38BDF8' : '#0284C7', marginBottom: 3, fontFamily: 'monospace' }}>
              {item.value > 0 ? fmt(item.value, 1) : ''}
            </Text>
            <View style={{
              width: barWidth,
              height: 38,
              backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : '#E0F2FE',
              borderRadius: 7,
              justifyContent: 'flex-end',
              overflow: 'hidden',
            }}>
              <View style={{
                width: '100%',
                height: `${heightPct}%`,
                backgroundColor: item.value > 0 ? (isDark ? '#38BDF8' : '#0284C7') : 'transparent',
                borderRadius: 7,
              }} />
            </View>
            <Text style={{ fontSize: 9, fontWeight: '600', color: isDark ? colors.textMuted : '#64748B', marginTop: 4 }}>
              {item.t}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function RainCard({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'live' | '24h' | '7day'>('live');
  const locale = locOf(i18n.language);
  const { isSummary, toggle } = useCardSummaryMode();

  const cur = dash.descriptive.current;
  const pred = dash.predictive;
  const today = todayRainMm(dash);
  const imd = imdRainfallCategory(today);
  const hourly = pred.hourly || [];

  const rainHours = hourly.length > 0
    ? hourly.slice(0, 8).map((h) => ({ t: h.hour || hhmm(h.t), value: Number(h.precip_mm) || 0 }))
    : (dash.descriptive.series.precip_hourly || []).slice(0, 8).map((p) => ({ t: hhmm(p.t), value: Number(p.value) || 0 }));

  const rain24 = hourly.length > 0
    ? hourly.slice(0, 24).map((h) => ({ t: h.hour || hhmm(h.t), value: Number(h.precip_mm) || 0 }))
    : (dash.descriptive.series.precip_hourly || []).slice(0, 24).map((p) => ({ t: hhmm(p.t), value: Number(p.value) || 0 }));

  const days7 = (pred.outlook_days || []).slice(0, 7).map((d) => ({
    t: weekday(d.date),
    val: Number(d.precip_mm) || 0,
    prob: Number(d.precip_prob_pct) || 0,
  }));

  const chance = pred.precip_probability_pct?.[0] ?? pred.outlook_days?.[0]?.precip_prob_pct ?? 0;
  const balance = pred.water_balance_7d_mm ?? pred.outlook_days?.[0]?.water_balance_mm ?? 0;

  const sum24 = rain24.reduce((acc, h) => acc + (Number(h.value) || 0), 0);
  const total7d = days7.reduce((acc, d) => acc + (Number(d.val) || 0), 0);
  const max24Item = rain24.reduce((max, h) => (h.value > max.value ? h : max), rain24[0] || { t: '00:00', value: 0 });
  const peak = {
    value: max24Item?.value || 0,
    t: max24Item?.t || '00:00',
  };
  const wet = rain24.filter((h) => Number(h.value) > 0.05).length;

  const layman = getRainLaymanSummary(dash, locale);

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'live' | '24h' | '7day') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  return (
    <View style={{
      backgroundColor: isDark ? '#0B2220' : '#E3FAF0',
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
          <CloudRain size={20} color="#38BDF8" strokeWidth={2.5} />
          <Text style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#38BDF8',
            letterSpacing: 1.2,
            fontFamily: 'System',
          }}>
            {t('rainfallPrecip')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleSummary}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: 'rgba(56,189,248,0.15)',
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0284C7', letterSpacing: 0.5 }}>
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
          {/* ── Pill Tab Switcher: LIVE | 24H | 7-DAY ── */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(15,29,48,0.7)' : '#D7F5E9',
            borderRadius: 20,
            padding: 3,
            alignSelf: 'flex-start',
            marginBottom: 14,
            borderWidth: 1,
            borderColor: isDark ? colors.border : 'rgba(2,132,199,0.1)',
          }}>
            <TouchableOpacity
              onPress={() => switchTab('live')}
              style={{
                backgroundColor: tab === 'live' ? '#0284C7' : 'transparent',
                paddingHorizontal: 16,
                paddingVertical: 6,
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
              onPress={() => switchTab('24h')}
              style={{
                backgroundColor: tab === '24h' ? '#0284C7' : 'transparent',
                paddingHorizontal: 16,
                paddingVertical: 6,
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
            <TouchableOpacity
              onPress={() => switchTab('7day')}
              style={{
                backgroundColor: tab === '7day' ? '#0284C7' : 'transparent',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === '7day' ? '#FFFFFF' : isDark ? colors.textMuted : '#475569',
                letterSpacing: 0.5,
              }}>{t('day7')}</Text>
            </TouchableOpacity>
          </View>

          <SmoothFadeView activeKey={tab}>

          {/* ── Dynamic View Based on Selected Tab ── */}
          {tab === 'live' ? (
            <>
              {/* ── 1H RATE / TODAY Info ── */}
              <Text style={{
                fontSize: 10.5,
                fontWeight: '800',
                color: isDark ? colors.textMuted : '#475569',
                letterSpacing: 0.8,
                marginBottom: 4,
              }}>
                1H RATE / TODAY
              </Text>

              {/* ── Value Row & Status Tag ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{
                    fontSize: 32,
                    fontWeight: '900',
                    color: isDark ? '#38BDF8' : '#0284C7',
                    fontFamily: 'monospace',
                    letterSpacing: -1,
                  }}>
                    {localizeNumber(fmt(cur.precip_1h_mm), i18n.language)}
                  </Text>
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: isDark ? '#38BDF8' : '#0284C7',
                    fontFamily: 'monospace',
                    marginRight: 6,
                  }}>
                    {t('unitMm')}
                  </Text>
                  <Text style={{
                    fontSize: 12.5,
                    color: isDark ? colors.textSecondary : '#334155',
                    fontFamily: 'monospace',
                    fontWeight: '600',
                  }}>
                    ({localizeNumber(fmt(today), i18n.language)} {t('unitMm')} total)
                  </Text>
                </View>

                {/* Status capsule */}
                <View style={{
                  backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE',
                  borderColor: isDark ? 'rgba(56,189,248,0.35)' : '#BAE6FD',
                  borderWidth: 1.5,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}>
                  <Text style={{
                    fontSize: 10.5,
                    fontWeight: '900',
                    color: isDark ? '#38BDF8' : '#0284C7',
                    letterSpacing: 0.5,
                  }}>
                    {imd.label.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* ── 4 Capsule Stats Row ── */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 16 }}>
                {/* Capsule 1: 3-DAY */}
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>{t('acc3DayShort')}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(pred.precip_next_3d_mm), i18n.language)} <Text style={{ fontSize: 10.5, fontWeight: '700' }}>{t('unitMm')}</Text>
                  </Text>
                </View>

                {/* Capsule 2: 7-DAY */}
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>{t('day7')}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: isDark ? '#0F172A' : '#0F172A', marginTop: 4, fontFamily: 'monospace' }}>
                    {localizeNumber(fmt(pred.precip_7d_mm), i18n.language)} <Text style={{ fontSize: 10.5, fontWeight: '700' }}>{t('unitMm')}</Text>
                  </Text>
                </View>

                {/* Capsule 3: CHANCE */}
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>{t('prob').toUpperCase()}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                    {localizeNumber(Math.round(Number(chance)), i18n.language)}%
                  </Text>
                </View>

                {/* Capsule 4: BALANCE */}
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#64748B', letterSpacing: 0.5 }}>{t('wb')}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: isDark ? colors.text : '#0F172A', marginTop: 4, fontFamily: 'monospace' }}>
                    {Number(balance) >= 0 ? `+${localizeNumber(fmt(balance), i18n.language)}` : localizeNumber(fmt(balance), i18n.language)}
                  </Text>
                </View>
              </View>

              <CleanRainChart data={rainHours} width={width - 68} isDark={isDark} colors={colors} />
            </>
          ) : tab === '24h' ? (
            /* ── 24H HYETOGRAPH VIEW ── */
            <View>
              {/* Header: Title + Peak info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? colors.text : '#334155' }}>24h Hyetograph</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                  Peak: <Text style={{ color: isDark ? '#38BDF8' : '#0284C7', fontWeight: '900' }}>{localizeNumber(fmt(peak.value, 0), i18n.language)} {t('unitMm')}</Text> @ {peak.t}
                </Text>
              </View>

              {/* 24-Hour Hyetograph Chart with Y-axis & dashed grid lines */}
              <Hyetograph24hChart data={rain24} width={width - 68} isDark={isDark} colors={colors} />

              {/* Footer: Wet hours + 24h Sum */}
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#D1F4E6', marginVertical: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: isDark ? colors.textMuted : '#475569', fontWeight: '500' }}>
                  {localizeNumber(wet, i18n.language)} wet hours forecast
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? colors.text : '#0F172A', fontFamily: 'monospace' }}>
                  24h Sum: <Text style={{ fontWeight: '900' }}>{localizeNumber(fmt(sum24), i18n.language)} {t('unitMm')}</Text>
                </Text>
              </View>
            </View>
          ) : (
            /* ── 7-DAY RAIN OUTLOOK VIEW ── */
            <View>
              {/* Header: Title + Total */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? colors.text : '#334155' }}>7-Day Rain Outlook</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace' }}>
                  Total: <Text style={{ color: isDark ? '#38BDF8' : '#0284C7', fontWeight: '900' }}>{localizeNumber(fmt(total7d), i18n.language)} {t('unitMm')}</Text>
                </Text>
              </View>

              {/* 7 Horizontal Pill Bars */}
              <View style={{ gap: 8 }}>
                {days7.map((day) => {
                  const maxDayVal = Math.max(...days7.map((d) => d.val), 10);
                  const progressPct = Math.min(Math.max((day.val / maxDayVal) * 100, day.val > 0 ? 6 : 2), 100);
                  return (
                    <View
                      key={day.t}
                      style={{
                        backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
                        borderRadius: 20,
                        paddingVertical: 8,
                        paddingHorizontal: 14,
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
                      {/* Day Label */}
                      <Text style={{ width: 36, fontSize: 12.5, fontWeight: '800', color: isDark ? colors.text : '#334155' }}>
                        {day.t}
                      </Text>

                      {/* Progress Track */}
                      <View style={{
                        flex: 1,
                        height: 7,
                        backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : '#E0F2FE',
                        borderRadius: 4,
                        marginHorizontal: 12,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          backgroundColor: isDark ? '#38BDF8' : '#2563EB',
                          borderRadius: 4,
                        }} />
                      </View>

                      {/* Value & Chance */}
                      <Text style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: isDark ? '#38BDF8' : '#0284C7',
                        fontFamily: 'monospace',
                        textAlign: 'right',
                        minWidth: 100,
                      }}>
                        {localizeNumber(fmt(day.val), i18n.language)} {t('unitMm')} <Text style={{ color: isDark ? colors.textMuted : '#64748B', fontWeight: '600', fontSize: 11 }}>({localizeNumber(Math.round(day.prob), i18n.language)}%)</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          </SmoothFadeView>
        </>
      )}
    </View>
  );
}

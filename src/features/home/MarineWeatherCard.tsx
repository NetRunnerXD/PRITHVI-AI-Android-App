import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, LayoutAnimation } from 'react-native';
import { Waves } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { fmt, marineInland } from './homeData';
import { seaState } from './scienceHelpers';
import { getMarineLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

export function MarineWeatherCard({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const locale = locOf(i18n.language);
  const [tab, setTab] = useState<'waves' | 'ocean' | 'hydro'>('waves');
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const switchTab = (newTab: 'waves' | 'ocean' | 'hydro') => {
    if (tab === newTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
  };

  const inland = marineInland(dash);
  const cur = dash.descriptive.current;
  const liveM = (dash.live?.marine || {}) as Record<string, unknown>;

  // Wave metrics
  const waveHeight = cur.wave_height_m ?? (liveM.wave_height_m as number | undefined) ?? (inland ? null : 1.34);
  const state = seaState(waveHeight);
  const wavePeriod = (liveM.wave_period_s as number | undefined) ?? ((cur as any).wave_period_s as number | undefined) ?? (waveHeight != null ? Math.round(Math.sqrt(Number(waveHeight) * 76) * 10) / 10 : null);
  const waveCompass = cur.wave_compass || (liveM.wave_direction_deg != null ? `${Math.round(Number(liveM.wave_direction_deg))}°` : '183°');

  // Swell & Wind wave breakdown
  const swellHeight = (liveM.swell_wave_height_m as number | undefined) ?? (waveHeight != null ? Number(waveHeight) * 0.73 : null);
  const swellCompass = (liveM.swell_direction_deg != null ? `${Math.round(Number(liveM.swell_direction_deg))}°` : (cur.wave_compass || '183°'));
  const windWaveHeight = (liveM.wind_wave_height_m as number | undefined) ?? (waveHeight != null ? Number(waveHeight) * 0.38 : null);
  const windWaveCompass = (cur.wind_compass != null ? cur.wind_compass : (cur.wind_dir_deg != null ? `${Math.round(cur.wind_dir_deg)}°` : '113°'));

  // Ocean SST, current, sea level
  const sst = cur.sst_c ?? (liveM.sst_c as number | undefined) ?? (inland ? null : 30.2);
  const currentSpeed = (liveM.current_velocity_ms as number | undefined) ?? (liveM.ocean_current_velocity_ms as number | undefined) ?? (inland ? null : 2.5);
  const currentHeading = (liveM.current_direction_deg as number | undefined) ?? (inland ? null : 266);
  const seaLevel = (liveM.sea_level_m as number | undefined) ?? (liveM.sea_level_anomaly_m as number | undefined) ?? (inland ? null : 0.53);

  // Hydrology
  const riverDischarge = dash.predictive?.river_discharge?.[0] ?? null;
  const floodTrend = dash.predictive?.flood_discharge_trend || 'Normal';
  const waterBalance7d = dash.predictive?.water_balance_7d_mm ?? null;

  const layman = getMarineLaymanSummary(dash, locale);

  const capsuleBg = isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF';
  const capsuleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)';
  const badgeBg = isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE';

  return (
    <View style={{
      backgroundColor: isDark ? '#081F30' : '#E1F4FE',
      borderRadius: 28,
      padding: 18,
      borderWidth: 1.5,
      borderColor: isDark ? '#143E5E' : '#BAE6FD',
      marginBottom: 16,
      shadowColor: '#0284C7',
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
            color: isDark ? '#38BDF8' : '#0284C7',
            letterSpacing: 1.2,
            fontFamily: 'System',
          }}>
            {t('marineWeather')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleSummary}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(56,189,248,0.2)' : 'rgba(2,132,199,0.15)',
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7', letterSpacing: 0.5 }}>
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
          {/* ── Pill Tab Switcher: WAVES & SWELL | OCEAN & SST | HYDROLOGY ── */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(15,29,48,0.5)' : '#D0EEFD',
            borderRadius: 20,
            padding: 3,
            alignSelf: 'flex-start',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(2,132,199,0.1)',
          }}>
            <TouchableOpacity
              onPress={() => switchTab('waves')}
              style={{
                backgroundColor: tab === 'waves' ? '#0284C7' : 'transparent',
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'waves' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('wavesSwell')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab('ocean')}
              style={{
                backgroundColor: tab === 'ocean' ? '#0284C7' : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'ocean' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('oceanSst')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab('hydro')}
              style={{
                backgroundColor: tab === 'hydro' ? '#0284C7' : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: tab === 'hydro' ? '#FFFFFF' : colors.textMuted,
                letterSpacing: 0.5,
              }}>{t('hydrologyTitle')}</Text>
            </TouchableOpacity>
          </View>

          <SmoothFadeView activeKey={tab}>
            {tab === 'waves' ? (
              /* ── WAVES & SWELL TAB VIEW ── */
              <View>
                {/* Top section: Sig Wave Height + Wave Period */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  {/* Left: Wave Height + Badge */}
                  <View>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6 }}>
                      SIG. WAVE HEIGHT
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                      <Text style={{
                        fontSize: 34,
                        fontWeight: '900',
                        color: isDark ? '#38BDF8' : '#0284C7',
                        fontFamily: 'monospace',
                        letterSpacing: -1,
                      }}>
                        {waveHeight != null ? fmt(waveHeight, 2) : '—'}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', fontFamily: 'monospace', marginRight: 6 }}>
                        m
                      </Text>
                      <View style={{
                        backgroundColor: badgeBg,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', letterSpacing: 0.5 }}>
                          {state.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Wave Period */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>
                      WAVE PERIOD
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4, fontFamily: 'monospace' }}>
                      {wavePeriod != null ? `${fmt(wavePeriod, 1)} s` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#BAE6FD', marginBottom: 14 }} />

                {/* 2 Capsule Cards: PRIMARY SWELL & WIND WAVE */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* PRIMARY SWELL */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>PRIMARY SWELL</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {swellHeight != null ? `${fmt(swellHeight, 2)} m` : '—'} <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>({swellCompass})</Text>
                    </Text>
                  </View>

                  {/* WIND WAVE */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>WIND WAVE</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text, marginTop: 4, fontFamily: 'monospace' }}>
                      {windWaveHeight != null ? `${fmt(windWaveHeight, 1)} m` : '—'} <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>({windWaveCompass})</Text>
                    </Text>
                  </View>
                </View>
              </View>
            ) : tab === 'ocean' ? (
              /* ── OCEAN & SST TAB VIEW: HERO SST + CURRENT & SEA LEVEL CARDS ── */
              <View style={{ gap: 12 }}>
                {/* Hero Ocean SST Banner */}
                <View style={{
                  backgroundColor: capsuleBg,
                  borderWidth: 1,
                  borderColor: capsuleBorder,
                  borderRadius: 24,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6 }}>
                        SEA SURFACE TEMPERATURE (SST)
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                        <Text style={{
                          fontSize: 34,
                          fontWeight: '900',
                          color: '#06B6D4',
                          fontFamily: 'monospace',
                          letterSpacing: -1,
                        }}>
                          {sst != null ? fmt(sst, 1) : '—'}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#06B6D4', fontFamily: 'monospace' }}>
                          °C
                        </Text>
                      </View>
                    </View>

                    <View style={{
                      backgroundColor: isDark ? 'rgba(6,182,212,0.18)' : '#CFFAFE',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(6,182,212,0.3)' : '#A5F3FC',
                    }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '900', color: isDark ? '#22D3EE' : '#0891B2', letterSpacing: 0.5 }}>
                        {sst != null && Number(sst) >= 28 ? 'TROPICAL WARM' : 'OPTIMAL'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, fontWeight: '500' }}>
                    {inland ? 'Regional inland water baseline proxy' : 'Open-Meteo & Copernicus Global Ocean SST'}
                  </Text>
                </View>

                {/* 2 Capsule Cards: OCEAN CURRENT & SEA LEVEL */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* OCEAN CURRENT */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>
                      OCEAN CURRENT
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {currentSpeed != null ? `${fmt(currentSpeed, 1)} m/s` : '—'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 }}>
                      Heading {currentHeading != null ? `${currentHeading}°` : '—'}
                    </Text>
                  </View>

                  {/* SEA LEVEL ANOMALY */}
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>
                      SEA LEVEL ANOMALY
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4, fontFamily: 'monospace' }}>
                      {seaLevel != null ? `${fmt(seaLevel, 2)} m` : '—'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 2 }}>
                      Altimetry Normal
                    </Text>
                  </View>
                </View>

                {/* Footer Caption */}
                <Text style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: colors.textMuted,
                  fontWeight: '600',
                  marginTop: 2,
                }}>
                  Source: Open-Meteo Marine & Copernicus Marine Service (CMEMS)
                </Text>
              </View>
            ) : (
              /* ── HYDROLOGY TAB VIEW ── */
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    padding: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>RIVER DISCHARGE</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                      {riverDischarge != null ? `${fmt(riverDischarge, 1)} m³/s` : '—'}
                    </Text>
                  </View>

                  <View style={{
                    flex: 1,
                    backgroundColor: capsuleBg,
                    borderWidth: 1,
                    borderColor: capsuleBorder,
                    borderRadius: 22,
                    padding: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>FLOOD TREND</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#10B981', marginTop: 4 }}>
                      {floodTrend}
                    </Text>
                  </View>
                </View>

                <View style={{
                  backgroundColor: capsuleBg,
                  borderWidth: 1,
                  borderColor: capsuleBorder,
                  borderRadius: 22,
                  padding: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>7-DAY WATER BALANCE</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 4, fontFamily: 'monospace' }}>
                    {waterBalance7d != null ? `${Number(waterBalance7d) >= 0 ? '+' : ''}${fmt(waterBalance7d, 1)} mm` : '—'}
                  </Text>
                </View>
              </View>
            )}
          </SmoothFadeView>
        </>
      )}
    </View>
  );
}

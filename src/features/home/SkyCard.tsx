import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Animated, LayoutAnimation } from 'react-native';
import { Droplets, Cloud, Eye, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { acc3DayMm, feelsLikeC, fmt, todayRainMm } from './homeData';
import { getSkyLaymanSummary, type Locale } from './laymanSummaries';
import { useCardSummaryMode, SummaryBlock, laymanToCard } from './SummaryBlock';
import { SmoothFadeView } from '../../components/SmoothFadeView';
import { localizeNumber } from '../../utils/localize';
import Svg, { Rect, Circle, Path, G, Line } from 'react-native-svg';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

export function SkyCard({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const locale = locOf(i18n.language);
  const { isSummary, toggle } = useCardSummaryMode();

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle();
  };

  const cur = dash.descriptive?.current;
  const sky = (dash.live?.sky || {}) as Record<string, unknown>;
  const temp = Number(sky.temp_c ?? cur?.temp_c);
  const rh = Number(sky.humidity_pct ?? cur?.humidity_pct);
  const feels = cur?.apparent_temp_c ?? feelsLikeC(temp, rh);
  const vis = cur?.visibility_km ?? (sky.visibility_km as number | undefined);
  const rain1h = cur?.precip_1h_mm ?? (sky.precip_1h_mm as number | undefined);
  const today = todayRainMm(dash);
  const acc3 = acc3DayMm(dash);
  const rawLabel = String(sky.label || cur?.sky_label || '—');
  const label = t(rawLabel.toLowerCase().replace(/\s+/g, '_'), { defaultValue: rawLabel });
  const day = Boolean(sky.is_day ?? cur?.is_day);
  const cloudCover = Number(sky.cloud_cover_pct ?? cur?.cloud_cover_pct);

  const layman = getSkyLaymanSummary(dash, locale);

  return (
    <View style={{
      backgroundColor: isDark ? '#081E32' : '#E1F3FD',
      borderRadius: 28,
      padding: 18,
      borderWidth: 1.5,
      borderColor: isDark ? '#133D60' : '#BAE6FD',
      marginBottom: 16,
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    }}>
      {/* ── Header: Dot + Title & Top-Right Sparkle Action ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Double ring blue dot */}
          <View style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#BAE6FD',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#0284C7',
            }} />
          </View>
          <Text style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#38BDF8',
            letterSpacing: 1.2,
            fontFamily: 'System',
          }}>
            {t('skyAtmosphere')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleSummary}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isDark ? 'rgba(15,29,48,0.9)' : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? colors.border : '#BAE6FD',
            shadowColor: '#0284C7',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.08,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Sparkles size={18} color={isDark ? '#38BDF8' : '#0284C7'} />
        </TouchableOpacity>
      </View>

      {isSummary ? (
        <SmoothFadeView activeKey="summary">
          <SummaryBlock summary={laymanToCard(layman)} />
        </SmoothFadeView>
      ) : (
        <SmoothFadeView activeKey="detail">
          {/* ── Main Row: Temp & Condition info + Weather Art Card ── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            {/* Left side: Temp, Feels like, Condition, Location */}
            <View style={{ flex: 1, paddingRight: 10 }}>
              {/* Temperature */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{
                  fontSize: 34,
                  fontWeight: '900',
                  color: isDark ? colors.text : '#0F172A',
                  fontFamily: 'monospace',
                  letterSpacing: -1,
                }}>
                  {localizeNumber(fmt(temp), i18n.language)}
                </Text>
                <Text style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: isDark ? colors.text : '#0F172A',
                  fontFamily: 'monospace',
                  marginLeft: 6,
                }}>
                  {t('unitC')}
                </Text>
              </View>

              {/* Feels like */}
              <Text style={{
                fontSize: 13,
                color: isDark ? colors.textSecondary : '#475569',
                fontFamily: 'monospace',
                fontWeight: '600',
                marginTop: 2,
              }}>
                {t('feels')} {localizeNumber(fmt(feels), i18n.language)} {t('unitC')}
              </Text>

              {/* Condition Label + DAY/NIGHT Badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: isDark ? colors.text : '#0F172A',
                  letterSpacing: -0.2,
                }}>
                  {label}
                </Text>
                <View style={{
                  backgroundColor: isDark ? 'rgba(2,132,199,0.25)' : '#E0F2FE',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? 'rgba(56,189,248,0.3)' : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 10.5,
                    fontWeight: '900',
                    color: isDark ? '#38BDF8' : '#0284C7',
                    letterSpacing: 0.5,
                  }}>
                    {day ? t('day') : t('night')}
                  </Text>
                </View>
              </View>

              {/* Location Label */}
              <Text style={{
                fontSize: 12,
                color: isDark ? colors.textMuted : '#475569',
                marginTop: 6,
                fontWeight: '500',
              }}>
                {dash.location.label}
              </Text>
            </View>

            {/* Right side: Illustrated Weather Card with dynamic animated sky condition */}
            <AnimatedWeatherCard
              rainRate={rain1h != null && rain1h > 0 ? `${localizeNumber(fmt(rain1h), i18n.language)} ${t('unitMm')}/h` : null}
              condition={rawLabel}
              isDay={day}
            />
          </View>

          {/* ── 2x3 Grid of White Capsule Cards ── */}
          {/* Row 1: HUMIDITY | CLOUD | VISIBILITY */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {/* HUMIDITY */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
              borderRadius: 22,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Droplets size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.5 }}>{t('humidity').toUpperCase()}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? colors.text : '#0F172A', marginTop: 6, fontFamily: 'monospace' }}>
                {rh != null && !isNaN(rh) ? `${localizeNumber(fmt(rh, 0), i18n.language)}%` : '—'}
              </Text>
            </View>

            {/* CLOUD */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
              borderRadius: 22,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Cloud size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.5 }}>{t('cloud')}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? colors.text : '#0F172A', marginTop: 6, fontFamily: 'monospace' }}>
                {cloudCover != null && !isNaN(cloudCover) ? `${localizeNumber(fmt(cloudCover, 0), i18n.language)}%` : '—'}
              </Text>
            </View>

            {/* VISIBILITY */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
              borderRadius: 22,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Eye size={14} color={isDark ? '#2DD4BF' : '#0D9488'} />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.5 }}>{t('visibility')}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? colors.text : '#0F172A', marginTop: 6, fontFamily: 'monospace' }}>
                {vis != null && !isNaN(Number(vis)) ? `${localizeNumber(fmt(Number(vis), 1), i18n.language)} km` : '—'}
              </Text>
            </View>
          </View>

          {/* Row 2: RAIN THIS H... | TODAY'S RA... | 3-DAY ACC */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* RAIN THIS H... */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
              borderRadius: 22,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#38BDF8' : '#0284C7' }} />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.5 }} numberOfLines={1}>{t('rainThisHourShort')}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#38BDF8' : '#0284C7', marginTop: 6, fontFamily: 'monospace' }}>
                {rain1h != null ? `${localizeNumber(fmt(rain1h), i18n.language)} ${t('unitMm')}` : '—'}
              </Text>
            </View>

            {/* TODAY'S RA... */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
              borderRadius: 22,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#60A5FA' : '#2563EB' }} />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.5 }} numberOfLines={1}>{t('todaysRainShort')}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#60A5FA' : '#2563EB', marginTop: 6, fontFamily: 'monospace' }}>
                {today != null ? `${localizeNumber(fmt(today), i18n.language)} ${t('unitMm')}` : '—'}
              </Text>
            </View>

            {/* 3-DAY ACC */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(15,29,48,0.85)' : '#FFFFFF',
              borderRadius: 22,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#818CF8' : '#6366F1' }} />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? colors.textMuted : '#475569', letterSpacing: 0.5 }} numberOfLines={1}>{t('acc3DayShort')}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#818CF8' : '#6366F1', marginTop: 6, fontFamily: 'monospace' }}>
                {acc3 != null ? `${localizeNumber(fmt(acc3), i18n.language)} ${t('unitMm')}` : '—'}
              </Text>
            </View>
          </View>
        </SmoothFadeView>
      )}
    </View>
  );
}

/**
 * Dynamic Animated Weather Tile
 * Supports animations for:
 * - Rain/Drizzle (animated falling rain streaks)
 * - Sunny/Day (pulsing sun ray glow & rotation)
 * - Clear Night (glowing moon with floating star shimmer)
 * - Cloudy/Overcast (slow drifting cloud layers)
 * - Thunderstorm (flashing lightning effect with storm clouds)
 */
function AnimatedWeatherCard({
  rainRate,
  condition,
  isDay,
}: {
  rainRate: string | null;
  condition: string;
  isDay: boolean;
}) {
  const w = 126;
  const h = 106;
  const cond = condition.toLowerCase();
  const isRain = cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower');
  const isThunder = cond.includes('thunder') || cond.includes('storm');
  const isCloudy = cond.includes('cloud') || cond.includes('overcast');
  const isClear = !isRain && !isThunder && !isCloudy;

  // React Native loop animations
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration: isRain || isThunder ? 1200 : 4000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animValue, isRain, isThunder]);

  // Rain drop translations
  const rainTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 30],
  });
  const rainOpacity = animValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Cloud gentle floating drift
  const cloudTranslateX = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-4, 4, -4],
  });

  // Sun / Moon pulse scale
  const celestialScale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });

  // Thunder flash opacity
  const lightningOpacity = animValue.interpolate({
    inputRange: [0, 0.45, 0.5, 0.55, 0.6, 1],
    outputRange: [0, 0, 1, 0, 0.8, 0],
  });

  // Sky palette based on time and condition
  const skyBg = isThunder
    ? '#181A29'
    : isRain
    ? isDay ? '#334E68' : '#272E3F'
    : isCloudy
    ? isDay ? '#627D98' : '#1E293B'
    : isDay
    ? '#0284C7'
    : '#1E293B';

  return (
    <View style={{
      width: w,
      height: h,
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: skyBg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    }}>
      {/* Background Static Elements */}
      <Svg width={w} height={h} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Stars at night */}
        {!isDay ? (
          <>
            <Circle cx={22} cy={24} r={1} fill="#CBD5E1" opacity={0.6} />
            <Circle cx={106} cy={27} r={1.2} fill="#FFFFFF" opacity={0.8} />
            <Circle cx={90} cy={16} r={0.8} fill="#CBD5E1" opacity={0.5} />
            <Circle cx={45} cy={18} r={1} fill="#CBD5E1" opacity={0.7} />
          </>
        ) : (
          /* Subtle sun rays at daytime */
          <Circle cx={70} cy={34} r={32} fill="rgba(253, 224, 71, 0.15)" />
        )}
      </Svg>

      {/* Sun / Moon Celestial Object with animated pulse */}
      <Animated.View style={{
        position: 'absolute',
        top: 14,
        left: 50,
        transform: [{ scale: celestialScale }],
      }}>
        <Svg width={46} height={46}>
          {isDay ? (
            <>
              <Circle cx={23} cy={23} r={18} fill="rgba(253, 224, 71, 0.3)" />
              <Circle cx={23} cy={23} r={12} fill="#FACC15" />
            </>
          ) : (
            <>
              <Circle cx={23} cy={23} r={18} fill="rgba(186, 230, 253, 0.25)" />
              <Circle cx={23} cy={23} r={12} fill="#F8FAFC" />
            </>
          )}
        </Svg>
      </Animated.View>

      {/* Animated Floating Clouds */}
      <Animated.View style={{
        position: 'absolute',
        top: 28,
        left: 0,
        width: w,
        height: 60,
        transform: [{ translateX: cloudTranslateX }],
      }}>
        <Svg width={w} height={60}>
          {/* Back Cloud */}
          <G fill={isDay ? '#94A3B8' : '#2E374D'} opacity={0.85}>
            <Circle cx={54} cy={20} r={15} />
            <Circle cx={76} cy={16} r={18} />
            <Circle cx={96} cy={20} r={14} />
            <Rect x={44} y={20} width={60} height={16} rx={8} />
          </G>

          {/* Front Cloud */}
          <G fill={isDay ? '#E2E8F0' : '#1F2637'}>
            <Circle cx={38} cy={30} r={16} />
            <Circle cx={60} cy={22} r={20} />
            <Circle cx={84} cy={26} r={16} />
            <Rect x={26} y={26} width={68} height={18} rx={8} />
          </G>
        </Svg>
      </Animated.View>

      {/* Animated Rain Drops for rainy conditions */}
      {(isRain || isThunder) && (
        <Animated.View style={{
          position: 'absolute',
          top: 48,
          left: 10,
          width: w,
          height: 50,
          opacity: rainOpacity,
          transform: [{ translateY: rainTranslateY }],
        }}>
          <Svg width={w} height={50}>
            <Line x1={32} y1={5} x2={22} y2={22} stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
            <Line x1={52} y1={2} x2={42} y2={19} stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
            <Line x1={72} y1={8} x2={62} y2={25} stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
            <Line x1={92} y1={4} x2={82} y2={21} stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      )}

      {/* Thunder Flash Animation */}
      {isThunder && (
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: w,
          height: h,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          opacity: lightningOpacity,
        }} />
      )}

      {/* Floating Rain Rate Capsule at Bottom-Right if raining */}
      {rainRate ? (
        <View style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          backgroundColor: 'rgba(224, 242, 254, 0.94)',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 12,
        }}>
          <Text style={{
            fontSize: 10,
            fontWeight: '900',
            color: '#0F172A',
            fontFamily: 'monospace',
          }}>
            {rainRate}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

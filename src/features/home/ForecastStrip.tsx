import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { CloudRain, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot } from '../../types';
import { localizeDayName, localizeNumber } from '../../utils/localize';
import { get7DayLaymanSummary, type Locale } from './laymanSummaries';
import { CardChrome } from './CardChrome';
import { SummaryBlock, laymanToCard } from './SummaryBlock';
import { fmt } from './homeData';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

export function ForecastStrip({ dash }: { dash: DashboardSnapshot }) {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const locale = locOf(i18n.language);
  const days = dash.predictive?.outlook_days || [];
  const layman = get7DayLaymanSummary(dash, locale);
  if (!days.length) return null;

  return (
    <CardChrome
      title={t('sevenDayOutlook')}
      accent="#0284c7"
      gradientColors={colors.plainGradient}
      style={{ borderColor: isDark ? colors.border : colors.borderLight }}
    >
      {({ isSummary, s }) =>
        isSummary ? (
          <SummaryBlock summary={laymanToCard(layman)} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
            {days.map((day) => {
              const [y, m, d] = (day.date || '').split('-');
              const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
              const dayName = !isNaN(dateObj.getTime()) ? localizeDayName(dateObj, i18n.language) : day.date.slice(5);
              return (
                <View
                  key={day.date}
                  style={{
                    width: 122,
                    marginRight: 10,
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: day.flood_watch ? '#ea580c' : day.irrigate ? '#0d9488' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2,132,199,0.15)',
                    backgroundColor: isDark ? 'rgba(15, 29, 48, 0.75)' : '#FFFFFF',
                    shadowColor: colors.shadowColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.15 : 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.text }}>{dayName}</Text>
                    {day.precip_mm > 0.5 ? <CloudRain size={18} color={colors.primary} /> : <Sun size={18} color="#fbbf24" />}
                  </View>
                  <Text style={{ fontWeight: '900', color: colors.text, fontSize: 15, marginTop: 6, letterSpacing: -0.2 }}>
                    {localizeNumber(fmt(day.temp_max_c), i18n.language)}° <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>/ {localizeNumber(fmt(day.temp_min_c), i18n.language)}°</Text>
                  </Text>
                  <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', marginVertical: 6 }} />
                  <Text style={[s.muted, { fontSize: 11 }]}>{t('rain')}: <Text style={{ fontWeight: '700', color: colors.text }}>{localizeNumber(fmt(day.precip_mm), i18n.language)} {t('unitMm')}</Text></Text>
                  <Text style={[s.muted, { fontSize: 11 }]}>{t('prob')}: <Text style={{ fontWeight: '700', color: colors.text }}>{localizeNumber(fmt(day.precip_prob_pct, 0), i18n.language)}%</Text></Text>
                  <Text style={[s.muted, { fontSize: 11 }]}>{t('wb')}: <Text style={{ fontWeight: '700', color: colors.text }}>{localizeNumber(fmt(day.water_balance_mm), i18n.language)}</Text></Text>
                  {day.flood_watch ? (
                    <View style={{ backgroundColor: 'rgba(234,88,12,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6 }}>
                      <Text style={{ color: '#ea580c', fontSize: 9, fontWeight: '800', textAlign: 'center' }}>{t('floodWatch')}</Text>
                    </View>
                  ) : null}
                  {day.irrigate ? (
                    <View style={{ backgroundColor: 'rgba(13,148,136,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6 }}>
                      <Text style={{ color: '#0d9488', fontSize: 9, fontWeight: '800', textAlign: 'center' }}>{t('irrigate')}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )
      }
    </CardChrome>
  );
}

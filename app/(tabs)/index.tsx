import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useDashboard, useAlerts, useNowcastLive } from '../../src/api/client';
import { useTheme } from '../../src/context/ThemeContext';
import { LocationPicker } from '../../src/components/LocationPicker';
import { HomeHeader } from '../../src/features/home/HomeHeader';
import { SkyCard } from '../../src/features/home/SkyCard';
import { RainCard } from '../../src/features/home/RainCard';
import { WindCard } from '../../src/features/home/WindCard';
import { AlertsRisksCard } from '../../src/features/home/AlertsRisksCard';
import { HazardStrip } from '../../src/features/home/HazardStrip';
import { ForecastStrip } from '../../src/features/home/ForecastStrip';
import { TabSourcesCard } from '../../src/features/sources/TabSourcesCard';

function formatGeneralizedDate(raw?: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[3]} ${match[2]} ${match[1]}`;
      return raw.split('T')[0] || raw;
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return raw.split('T')[0] || raw;
  }
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { data: dashboard, isLoading, isFetching, isPlaceholderData, error, refetch } = useDashboard();
  const { data: alerts } = useAlerts(Boolean(dashboard));
  const { data: nowcast } = useNowcastLive(Boolean(dashboard));
  const [picker, setPicker] = React.useState(false);

  if (isLoading && !dashboard) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.primary }}>{t('loadingLiveData')}</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.center}>
        <AlertTriangle size={32} color="#ef4444" />
        <Text style={{ marginTop: 12, color: '#ef4444', fontWeight: '600' }}>{t('failedToLoadData')}</Text>
        <Text style={{ marginTop: 8, color: colors.textMuted, fontSize: 12 }} onPress={() => void refetch()}>
          Tap to retry · PRITHVI-AI API
        </Text>
      </View>
    );
  }

  const rawDate = dashboard.live?.generated_at || dashboard.generated_at;
  const asOf = formatGeneralizedDate(rawDate);
  const isOfflineCache = Boolean(dashboard?.is_offline_cache || (isPlaceholderData && !dashboard?.live));
  const isRateLimited = Boolean(dashboard?.is_rate_limited);
  const showCacheBanner = isOfflineCache || isRateLimited;

  return (
    <LinearGradient colors={colors.backgroundGradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <LocationPicker visible={picker} onClose={() => setPicker(false)} />
        <HomeHeader generatedAt={dashboard.live?.generated_at || dashboard.generated_at} onSearch={() => setPicker(true)} />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isPlaceholderData} onRefresh={() => void refetch()} tintColor={colors.primary} />
          }
        >
          {showCacheBanner ? (
            <View style={{ backgroundColor: colors.alertCard, borderColor: colors.alertBorder, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: isDark ? '#fdba74' : '#9a3412', fontSize: 12 }}>
                {isRateLimited
                  ? `API exhausted, displaying cached data${asOf ? ` (${asOf})` : ''}`
                  : `Displaying offline cached data${asOf ? ` (${asOf})` : ''}`}
              </Text>
            </View>
          ) : null}
          <SkyCard dash={dashboard} />
          <AlertsRisksCard dash={dashboard} extra={alerts?.warnings} />
          <RainCard dash={dashboard} />
          <WindCard dash={dashboard} />
          <HazardStrip dash={dashboard} nowcast={nowcast} />
          <ForecastStrip dash={dashboard} />
          <TabSourcesCard tab="home" provenance={dashboard.science?.provenance} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});

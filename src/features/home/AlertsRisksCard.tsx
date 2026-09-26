import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, MapPin, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import { searchGeo } from '../../api/endpoints';
import type { DashboardSnapshot, Location, Warning } from '../../types';
import { homeCardStyles as stylesOf } from './cardStyles';
import { filterHomeAlerts, sortedRisks } from './homeData';
import { SummaryBlock, laymanToCard, useCardSummaryMode } from './SummaryBlock';
import { getAlertsLaymanSummary, type Locale } from './laymanSummaries';
import { useTranslation } from 'react-i18next';
import { localizeNumber } from '../../utils/localize';
import {
  alertTimePhase,
  formatAlertWindow,
  groupAlertsByLocation,
  INDIA_CITIES_MAP,
  type AlertCluster,
} from './alertModel';

export function AlertsRisksCard({ dash, extra }: { dash: DashboardSnapshot; extra?: Warning[] }) {
  const { colors, isDark } = useTheme();
  const s = stylesOf(colors, isDark);
  const { location, setLocation } = useLocation();
  const { isSummary, toggle } = useCardSummaryMode();
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language.startsWith('hi') ? 'hi' : i18n.language.startsWith('bn') ? 'bn' : 'en';
  const [panelTab, setPanelTab] = useState<'alerts' | 'risks'>('alerts');
  const [selected, setSelected] = useState<AlertCluster | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const merged = useMemo(() => [...(dash.prescriptive?.warnings || []), ...(extra || [])], [dash, extra]);
  const live = useMemo(
    () => filterHomeAlerts(merged).filter((w) => alertTimePhase(w) !== 'past'),
    [merged],
  );
  const clusters = useMemo(() => groupAlertsByLocation(live, location), [live, location]);
  const risks = sortedRisks(dash);
  const summary = getAlertsLaymanSummary(dash, locale);

  function applyPin(cluster: AlertCluster) {
    let lat = cluster.lat;
    let lon = cluster.lon;
    if ((lat == null || lon == null) && cluster.alerts?.length) {
      for (const a of cluster.alerts) {
        if (a.lat != null && a.lon != null) {
          lat = Number(a.lat);
          lon = Number(a.lon);
          break;
        }
      }
    }
    const cleanCity = (cluster.city || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const matched = (cleanCity ? INDIA_CITIES_MAP[cleanCity] : null) || null;

    if (lat != null && lon != null) {
      const loc: Location = {
        id: `loc_${lat}_${lon}`,
        label: `${matched?.city || cluster.city}, ${matched?.state || cluster.state}`,
        country: 'IN',
        state: matched?.state || cluster.state || 'India',
        district: matched?.city || cluster.city,
        lat,
        lon,
        timezone: 'Asia/Kolkata',
        place_kind: 'place',
        place_name: matched?.city || cluster.city,
      };
      setLocation(loc);
      return;
    }
    if (matched) {
      setLocation({
        id: `loc_${matched.lat}_${matched.lon}`,
        label: `${matched.city}, ${matched.state}`,
        country: 'IN',
        state: matched.state,
        district: matched.city,
        lat: matched.lat,
        lon: matched.lon,
        timezone: 'Asia/Kolkata',
        place_kind: 'place',
        place_name: matched.city,
      });
      return;
    }
    const q = [cluster.city, cluster.state].filter(Boolean).join(', ') || cluster.placeFormatted;
    if (!q) return;
    void searchGeo(q).then((hits) => {
      if (hits[0]) setLocation(hits[0]);
    });
  }

  return (
    <LinearGradient
      colors={colors.alertGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, { borderColor: colors.alertBorder }]}
    >
      <View style={s.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={[s.dot, { backgroundColor: '#ea580c', shadowColor: '#ea580c', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
          <Text style={s.cardTitle}>{t('alertsRisks')}</Text>
          {live.length > 0 ? (
            <View style={[s.pill, { backgroundColor: '#dc2626' }]}>
              <Text style={[s.pillText, { color: '#fff' }]}>{localizeNumber(live.length, i18n.language)}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={toggle}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.12)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.2)',
          }}
        >
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#ea580c', letterSpacing: 0.5 }}>
            {isSummary ? t('detail') : t('overview')}
          </Text>
        </TouchableOpacity>
      </View>

      {isSummary ? (
        <SummaryBlock summary={laymanToCard(summary)} onExpand={toggle} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            <Seg label={t('alerts')} active={panelTab === 'alerts'} onPress={() => setPanelTab('alerts')} colors={colors} />
            <Seg label={t('risks')} active={panelTab === 'risks'} onPress={() => setPanelTab('risks')} colors={colors} />
          </View>

          {panelTab === 'alerts' ? (
            clusters.length === 0 ? (
              <Text style={s.muted}>{t('noActiveBulletins')}</Text>
            ) : (
              <ScrollView
                style={{ maxHeight: clusters.length > 3 ? 340 : undefined }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {clusters.map((cluster) => (
                  <TouchableOpacity
                    key={cluster.id}
                    activeOpacity={0.85}
                    onPress={() => applyPin(cluster)}
                    style={[s.innerCard, { marginBottom: 8, borderLeftWidth: 4, borderLeftColor: cluster.primaryTheme?.color || '#ea580c' }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <MapPin size={14} color={cluster.primaryTheme?.color || '#ea580c'} />
                        <Text style={{ fontWeight: '800', color: colors.text, fontSize: 13, flex: 1 }} numberOfLines={1}>
                          {cluster.placeFormatted}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: cluster.primaryTheme?.color || '#ea580c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>
                        {String(cluster.highestSeverity || '').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                      {cluster.compositeTitle}
                    </Text>
                    {cluster.compositeAction ? (
                      <Text style={[s.muted, { marginTop: 4 }]} numberOfLines={2}>{cluster.compositeAction}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                      <Text style={s.muted}>
                        {cluster.isCurrentLoc ? t('activeLocation') : cluster.distKm != null ? `${localizeNumber(cluster.distKm, i18n.language)} ${t('kmFromPin')}` : t('regionalScope')}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => applyPin(cluster)}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{t('switchPin')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelected(cluster)}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{t('details')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          ) : (
            <ScrollView
              style={{ maxHeight: risks.length > 3 ? 340 : undefined }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {risks.map((r) => {
                const open = expandedRisk === r.id;
                const top = [...(r.factors || [])].sort((a, b) => (b.contribution_pct ?? 0) - (a.contribution_pct ?? 0))[0];
                return (
                  <TouchableOpacity key={r.id} style={[s.innerCard, { marginBottom: 8 }]} onPress={() => setExpandedRisk(open ? null : r.id)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <ChevronDown size={14} color={colors.textMuted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                        <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{r.label}</Text>
                      </View>
                      <Text style={{ fontWeight: '800', color: colors.text }}>{localizeNumber(Math.round(r.score_pct), i18n.language)}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 3, marginTop: 8 }}>
                      <View style={{ width: `${Math.min(100, Math.max(4, r.score_pct))}%`, height: 6, borderRadius: 3, backgroundColor: r.score_pct >= 70 ? '#e11d48' : r.score_pct >= 40 ? '#d97706' : '#64748b' }} />
                    </View>
                    {open && top ? (
                      <Text style={[s.muted, { marginTop: 8 }]}>Primary driver: {top.label} ({Math.round(top.contribution_pct)}%)</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ maxHeight: '80%', backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text, flex: 1 }}>{selected?.placeFormatted}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={{ fontWeight: '800', color: colors.primary }}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(selected?.alerts || []).map((a: Warning, i: number) => (
                <View key={a.id || i} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <AlertTriangle size={16} color="#d97706" />
                    <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{a.title}</Text>
                  </View>
                  {a.body ? <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>{a.body}</Text> : null}
                  <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 11 }}>
                    {(a.severity || '').toUpperCase()}
                    {a.source ? ` · ${a.source}` : ''}
                    {formatAlertWindow(a) ? ` · ${formatAlertWindow(a)}` : ''}
                  </Text>
                  {a.url ? (
                    <TouchableOpacity onPress={() => void Linking.openURL(a.url!)}>
                      <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Official bulletin →</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 20 }}
                onPress={() => {
                  if (selected) applyPin(selected);
                  setSelected(null);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Switch pin to this place</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function Seg({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: { primary: string; border: string; text: string };
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: active ? colors.primary : 'transparent',
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

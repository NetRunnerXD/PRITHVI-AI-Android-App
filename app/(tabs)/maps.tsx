import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { Layers, X, MapPin, Crosshair } from 'lucide-react-native';
import { useLocation } from '../../src/context/LocationContext';
import { useMapLayers, useMapRadar, useMapWeatherGrid, useStormMap } from '../../src/api/client';
import { API_BASE, API_PREFIX } from '../../src/api/config';
import { leafletHtml } from '../../src/features/map/leafletShell';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/context/ThemeContext';
import { TabSourcesCard } from '../../src/features/sources/TabSourcesCard';

const FIELD_WX = new Set(['wind', 'temp', 'precip', 'pressure', 'clouds', 'humidity', 'cape']);

const HIGHLIGHTS: { id: string; label: string }[] = [
  { id: 'lightning', label: 'Live lightning' },
  { id: 'pred_lightning', label: 'Predicted lightning' },
  { id: 'storm', label: 'Live storm' },
  { id: 'pred_storm', label: 'Predicted storm' },
  { id: 'cloudburst', label: 'Cloudburst' },
  { id: 'downburst', label: 'Downburst' },
  { id: 'cloud', label: 'Cold cloud' },
  { id: 'past_lightning', label: 'Past lightning' },
  { id: 'past_storm', label: 'Past storm' },
  { id: 'fire', label: 'Forest fire' },
  { id: 'landslide', label: 'Landslide' },
];

const EXTRA_OVERLAYS: { id: string; label: string }[] = [
  { id: 'gibs_truecolor', label: 'NASA GIBS true color' },
  { id: 'gibs_ir', label: 'Himawari IR' },
  { id: 'gibs_imerg', label: 'IMERG rain rate' },
  { id: 'bhuvan_geomorph', label: 'Bhuvan geomorph (WB)' },
  { id: 'bhuvan_geomorph_in', label: 'Bhuvan litho-geomorph (India)' },
];

function tileUrl(url?: string) {
  if (!url) return 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png';
  return url.replace('{s}', 'a');
}

function slimStorm(raw: unknown) {
  if (!raw || typeof raw !== 'object') return {};
  const s = raw as Record<string, unknown>;
  const take = (arr: unknown, n: number) => (Array.isArray(arr) ? arr.slice(0, n) : []);
  const pts = (rows: unknown[]) =>
    rows
      .map((r) => {
        const o = r as Record<string, unknown>;
        return {
          lat: o.lat,
          lon: o.lon,
          kind: o.kind,
          phase: o.phase,
          place: o.place || o.label,
        };
      })
      .filter((p) => p.lat != null && p.lon != null);
  return {
    cells: pts(take(s.cells, 80)),
    incidents: pts(take(s.incidents, 80)),
    predicted: pts(take(s.predicted, 60)),
    predicted_storms: pts(take(s.predicted_storms, 60)),
    past_strokes: pts(take((s.past_strokes as unknown[]) || (s.strokes as unknown[]) || [], 80)),
    past_cells: pts(take(s.past_cells, 60)),
    fires: pts(take(s.fires, 40)),
    landslides: pts(take(s.landslides, 40)),
    counts: s.counts || {},
  };
}

export default function MapsScreen() {
  const { t } = useTranslation();
  const { location, requestGps } = useLocation();
  const { colors, isDark } = useTheme();
  const s = createStyles(colors, isDark);
  const { data: layersData } = useMapLayers();
  const { data: radarData } = useMapRadar();

  const webViewRef = useRef<WebView>(null);
  const [menu, setMenu] = useState(false);
  const [basemapId, setBasemapId] = useState('dark');
  const [wxLayer, setWxLayer] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [opacity, setOpacity] = useState(0.55);
  const [fitNonce, setFitNonce] = useState(0);
  const [recenter, setRecenter] = useState(true);
  const html = useMemo(() => leafletHtml(isDark ? '#38BDF8' : '#0284C7'), [isDark]);

  const needGrid = !!wxLayer && FIELD_WX.has(wxLayer);
  const { data: grid } = useMapWeatherGrid(0, needGrid);
  const { data: stormRaw } = useStormMap('India', 6, true);
  const storm = useMemo(() => slimStorm(stormRaw), [stormRaw]);
  const counts = (storm.counts || {}) as Record<string, number>;

  const lat = location?.lat ?? 22.0667;
  const lon = location?.lon ?? 88.0698;

  const basemap = layersData?.basemaps?.find((b) => b.id === basemapId);
  const basemapUrl = tileUrl(
    basemap?.url ||
      (basemapId === 'dark'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : undefined)
  );

  const host = radarData?.host || 'https://tilecache.rainviewer.com';
  const radarUrl =
    wxLayer === 'radar' && radarData?.radar?.length
      ? `${host}${radarData.radar[radarData.radar.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`
      : null;
  const satUrl =
    wxLayer === 'satellite' && radarData?.satellite?.length
      ? `${host}${radarData.satellite[radarData.satellite.length - 1].path}/256/{z}/{x}/{y}/0/0_0.png`
      : null;

  const wmsUrl = `${API_BASE}${API_PREFIX}/map/wms`;
  const bhuvanWb = layersData?.overlays?.find((o) => o.id === 'bhuvan_geomorph')?.layers;
  const bhuvanIn = layersData?.overlays?.find((o) => o.id === 'bhuvan_geomorph_in')?.layers;

  useEffect(() => {
    const payload = {
      lat,
      lon,
      label: location.label,
      basemapUrl,
      wxLayer: needGrid ? wxLayer : null,
      radarUrl,
      satUrl,
      opacity,
      grid: needGrid && grid?.fields ? { nx: grid.nx, ny: grid.ny, lats: grid.lats, lons: grid.lons, fields: grid.fields } : null,
      overlays: {
        gibs_truecolor: overlays.includes('gibs_truecolor'),
        gibs_ir: overlays.includes('gibs_ir') || wxLayer === 'satellite',
        gibs_imerg: overlays.includes('gibs_imerg'),
        bhuvan_geomorph: overlays.includes('bhuvan_geomorph'),
        bhuvan_geomorph_in: overlays.includes('bhuvan_geomorph_in'),
        wmsUrl,
        bhuvanWb,
        bhuvanIn,
      },
      highlights,
      storm,
      fit: fitNonce,
      recenter,
      zoom: 8,
    };
    const js = `if(window.applyMap){window.applyMap(${JSON.stringify(payload)}); } true;`;
    webViewRef.current?.injectJavaScript(js);
    if (recenter) setRecenter(false);
  }, [
    lat,
    lon,
    location.label,
    basemapUrl,
    wxLayer,
    radarUrl,
    satUrl,
    opacity,
    grid,
    needGrid,
    overlays,
    highlights,
    storm,
    fitNonce,
    recenter,
    wmsUrl,
    bhuvanWb,
    bhuvanIn,
  ]);

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function locate() {
    await requestGps();
    setRecenter(true);
  }

  const weatherLayers = layersData?.weather?.length
    ? layersData.weather
    : [
        { id: 'wind', label: 'Wind' },
        { id: 'temp', label: 'Temperature' },
        { id: 'precip', label: 'Rain' },
        { id: 'pressure', label: 'Pressure' },
        { id: 'clouds', label: 'Clouds' },
        { id: 'humidity', label: 'Humidity' },
        { id: 'cape', label: 'CAPE' },
        { id: 'radar', label: 'Radar' },
        { id: 'satellite', label: 'Satellite IR' },
      ];

  const basemaps = (layersData?.basemaps || [
    { id: 'dark', label: 'Dark' },
    { id: 'streets', label: 'Streets' },
    { id: 'satellite', label: 'Satellite' },
    { id: 'terrain', label: 'Terrain' },
  ]).filter((b) => b.id !== 'positron' && b.id !== 'light');

  return (
    <View style={s.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        bounces={false}
        mixedContentMode="always"
        javaScriptEnabled
        onLoadEnd={() => setRecenter(true)}
      />

      <SafeAreaView style={s.safeOverlay} pointerEvents="box-none">
        <View style={s.topBar} pointerEvents="box-none">
          <View style={s.locationPill}>
            <MapPin size={14} color={colors.primary} />
            <Text style={s.locationText} numberOfLines={1}>
              {location.label}
            </Text>
          </View>
          <View style={s.countRow}>
            <Text style={s.countChip}>Ltn {counts.lightning ?? 0}</Text>
            <Text style={s.countChip}>Pred {counts.predicted ?? 0}</Text>
            <Text style={s.countChip}>Fire {counts.fire ?? 0}</Text>
          </View>
        </View>

        <View style={s.fabCol} pointerEvents="box-none">
          <TouchableOpacity style={s.fab} onPress={locate} activeOpacity={0.8}>
            <Crosshair color="#fff" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.fab}
            onPress={() => {
              setFitNonce((n) => n + 1);
            }}
            activeOpacity={0.8}
          >
            <Text style={s.fabTxt}>Fit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fab} onPress={() => setMenu(true)} activeOpacity={0.8}>
            <Layers color="#fff" size={22} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={menu} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('mapLayers')}</Text>
              <TouchableOpacity onPress={() => setMenu(false)} style={s.closeBtn}>
                <X color={colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sectionTitle}>{t('basemap')}</Text>
              <View style={s.grid}>
                {basemaps.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.layerBtn, basemapId === b.id && s.layerBtnActive]}
                    onPress={() => setBasemapId(b.id)}
                  >
                    <Text style={[s.layerTxt, basemapId === b.id && s.layerTxtActive]}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sectionTitle}>Weather</Text>
              <View style={s.grid}>
                <TouchableOpacity
                  style={[s.layerBtn, !wxLayer && s.layerBtnActive]}
                  onPress={() => setWxLayer(null)}
                >
                  <Text style={[s.layerTxt, !wxLayer && s.layerTxtActive]}>{t('none')}</Text>
                </TouchableOpacity>
                {weatherLayers.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[s.layerBtn, wxLayer === w.id && s.layerBtnActive]}
                    onPress={() => setWxLayer(w.id)}
                  >
                    <Text style={[s.layerTxt, wxLayer === w.id && s.layerTxtActive]}>{w.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sectionTitle}>Overlays</Text>
              <View style={s.grid}>
                {EXTRA_OVERLAYS.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[s.layerBtn, overlays.includes(o.id) && s.layerBtnActive]}
                    onPress={() => toggle(overlays, o.id, setOverlays)}
                  >
                    <Text style={[s.layerTxt, overlays.includes(o.id) && s.layerTxtActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sectionTitle}>Hazard highlights</Text>
              <View style={s.grid}>
                {HIGHLIGHTS.map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[s.layerBtn, highlights.includes(h.id) && s.layerBtnActive]}
                    onPress={() => toggle(highlights, h.id, setHighlights)}
                  >
                    <Text style={[s.layerTxt, highlights.includes(h.id) && s.layerTxtActive]}>{h.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TabSourcesCard tab="map" compact />

              <Text style={s.sectionTitle}>Opacity {Math.round(opacity * 100)}%</Text>
              <View style={s.grid}>
                {[0.35, 0.55, 0.7, 0.9].map((o) => (
                  <TouchableOpacity
                    key={o}
                    style={[s.layerBtn, Math.abs(opacity - o) < 0.02 && s.layerBtnActive]}
                    onPress={() => setOpacity(o)}
                  >
                    <Text style={[s.layerTxt, Math.abs(opacity - o) < 0.02 && s.layerTxtActive]}>
                      {Math.round(o * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safeOverlay: {
      flex: 1,
      justifyContent: 'space-between',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    topBar: { padding: 16, alignItems: 'center', gap: 8 },
    locationPill: {
      flexDirection: 'row',
      backgroundColor: isDark ? colors.frosted : 'rgba(255,255,255,0.92)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? colors.border : 'rgba(2,132,199,0.15)',
    },
    locationText: { fontWeight: '700', color: colors.text, fontSize: 14, maxWidth: 220 },
    countRow: { flexDirection: 'row', gap: 6 },
    countChip: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      backgroundColor: isDark ? colors.frosted : 'rgba(255,255,255,0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    fabCol: { position: 'absolute', bottom: 24, right: 24, gap: 10, alignItems: 'flex-end' },
    fab: {
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 28,
      minWidth: 52,
      alignItems: 'center',
    },
    fabTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      maxHeight: '82%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    closeBtn: { padding: 4 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 16,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hourRow: { marginTop: 8 },
    hourLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 },
    layerBtn: {
      backgroundColor: isDark ? colors.surface : colors.cardAlt,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : colors.borderLight,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    layerBtnActive: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
    layerTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    layerTxtActive: { color: colors.primary, fontWeight: '700' },
  });

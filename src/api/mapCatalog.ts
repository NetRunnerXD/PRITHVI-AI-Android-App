import { API_BASE, API_PREFIX } from './config';
import type { MapLayer, MapLayersResponse, MapRadarResponse } from '../types';

const BHUVAN_WB = 'gw_wfs:WB_LGEOM';
const BHUVAN_IN = [
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DL', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL',
  'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB',
]
  .map((s) => `gw_wfs:${s}_LGEOM`)
  .join(',');

export function clientMapLayers(): MapLayersResponse {
  const wms = `${API_BASE}${API_PREFIX}/map/wms`;
  const basemaps: MapLayer[] = [
    {
      id: 'dark',
      label: 'Dark',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    },
    { id: 'streets', label: 'Streets', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    {
      id: 'satellite',
      label: 'Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    },
    { id: 'terrain', label: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
  ];
  const weather: MapLayer[] = [
    { id: 'wind', label: 'Wind', unit: 'km/h', source: 'open-meteo' },
    { id: 'temp', label: 'Temperature', unit: '°C', source: 'open-meteo' },
    { id: 'precip', label: 'Rain', unit: 'mm/h', source: 'open-meteo' },
    { id: 'pressure', label: 'Pressure', unit: 'hPa', source: 'open-meteo' },
    { id: 'clouds', label: 'Clouds', unit: '%', source: 'open-meteo' },
    { id: 'humidity', label: 'Humidity', unit: '%', source: 'open-meteo' },
    { id: 'cape', label: 'CAPE', unit: 'J/kg', source: 'open-meteo' },
    { id: 'radar', label: 'Radar', unit: 'dBZ', source: 'rainviewer' },
    { id: 'satellite', label: 'Satellite IR', unit: 'K', source: 'rainviewer' },
  ];
  const overlays: MapLayer[] = [
    {
      id: 'gibs_truecolor',
      label: 'NASA GIBS True Color',
      type: 'wms',
      url: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
      layers: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    },
    {
      id: 'gibs_ir',
      label: 'Himawari IR',
      type: 'wms',
      url: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
      layers: 'Himawari_AHI_Band13_Clean_Infrared',
    },
    {
      id: 'gibs_imerg',
      label: 'IMERG rain rate',
      type: 'wms',
      url: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
      layers: 'IMERG_Precipitation_Rate',
    },
    { id: 'bhuvan_geomorph', label: 'Bhuvan geomorph (WB)', type: 'wms', url: wms, layers: BHUVAN_WB },
    { id: 'bhuvan_geomorph_in', label: 'Bhuvan litho-geomorph (India)', type: 'wms', url: wms, layers: BHUVAN_IN },
  ];
  return { basemaps, weather, overlays };
}

export async function fetchClientRadar(): Promise<MapRadarResponse | null> {
  try {
    const r = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!r.ok) return null;
    const body = await r.json();
    const radar = body.radar || {};
    const sat = body.satellite || {};
    const past = Array.isArray(radar.past) ? radar.past.slice(-8) : [];
    const nowcast = Array.isArray(radar.nowcast) ? radar.nowcast.slice(0, 4) : [];
    const infrared = Array.isArray(sat.infrared) ? sat.infrared.slice(-4) : [];
    return {
      ok: true,
      host: body.host || 'https://tilecache.rainviewer.com',
      radar: [...past, ...nowcast],
      satellite: infrared,
    };
  } catch {
    return null;
  }
}

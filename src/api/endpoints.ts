import { CHAT_TIMEOUT_MS, READY_TIMEOUT_MS } from './config';
import { fetchClientOmPack, fetchUsgsIndiaCsv, getLastOmPack, NASA_OFF_DEFAULT } from './clientSeed';
import { clientMtPreferred, questionToEnglish } from './onDeviceMt';
import { apiFetch, chatRequest, type ChatSseEvent } from './http';
import type {
  AlertsResponse,
  BootstrapResponse,
  ChatRequest,
  DashboardSnapshot,
  ForecastResponse,
  GeoSearchResponse,
  Location,
  MapLayersResponse,
  MapRadarResponse,
  MapWeatherGridResponse,
  MarketResponse,
  NowcastLiveResponse,
  RisksResponse,
} from '../types';

export function locQuery(loc: Location, extra?: Record<string, string>): string {
  const params: string[] = [];
  if (loc.district) params.push(`district=${encodeURIComponent(loc.district)}`);
  const place = loc.place_name || loc.label.split(',')[0];
  if (place) params.push(`place=${encodeURIComponent(place)}`);
  if (loc.lat !== undefined) params.push(`lat=${String(loc.lat)}`);
  if (loc.lon !== undefined) params.push(`lon=${String(loc.lon)}`);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.push(`${k}=${encodeURIComponent(v)}`);
    }
  }
  return params.join('&');
}

export async function getReady(): Promise<{ ok?: boolean }> {
  return apiFetch('/ready', { timeout: READY_TIMEOUT_MS });
}

export async function getBootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>('/bootstrap', { timeout: READY_TIMEOUT_MS });
}

async function postDashboard(
  loc: Location,
  locale: string,
  om: NonNullable<Awaited<ReturnType<typeof fetchClientOmPack>>>,
  usgs_csv?: string | null,
) {
  const disable = NASA_OFF_DEFAULT.join(',');
  return apiFetch<DashboardSnapshot>('/dashboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 45_000,
    body: JSON.stringify({
      location: loc,
      district: loc.district,
      place: loc.place_name || loc.label.split(',')[0],
      lat: loc.lat,
      lon: loc.lon,
      locale,
      disable,
      om: {
        forecast: om.forecast,
        air: om.air || undefined,
        flood: om.flood || undefined,
        marine: om.marine || undefined,
        models: om.models || undefined,
        era5: om.era5 || undefined,
      },
      fetched_at: om.fetched_at,
      usgs_csv: usgs_csv || undefined,
    }),
  });
}

export async function getDashboard(
  loc: Location,
  locale = 'en',
  opts?: { extras?: boolean },
): Promise<DashboardSnapshot> {
  const disable = NASA_OFF_DEFAULT.join(',');
  const extras = Boolean(opts?.extras);
  const [om, usgs_csv] = await Promise.all([
    loc.lat != null && loc.lon != null
      ? fetchClientOmPack(loc.lat, loc.lon, { extras })
      : Promise.resolve(null),
    extras ? Promise.resolve(null) : fetchUsgsIndiaCsv(),
  ]);
  if (om) return postDashboard(loc, locale, om, usgs_csv);
  return apiFetch<DashboardSnapshot>(`/dashboard?${locQuery(loc, { locale, disable })}`);
}

export async function enrichDashboard(loc: Location, locale = 'en'): Promise<DashboardSnapshot | null> {
  if (loc.lat == null || loc.lon == null) return null;
  const om = await fetchClientOmPack(loc.lat, loc.lon, { extras: true });
  if (!om) return null;
  return postDashboard(loc, locale, om, null);
}

export async function getAlerts(loc: Location, locale = 'en'): Promise<AlertsResponse> {
  return apiFetch<AlertsResponse>(`/alerts?${locQuery(loc, { locale })}`);
}

export async function getNowcastLive(loc: Location, locale = 'en'): Promise<NowcastLiveResponse> {
  return apiFetch<NowcastLiveResponse>(`/nowcast/live?${locQuery(loc, { locale })}`);
}

export async function getForecast(loc: Location): Promise<ForecastResponse> {
  return apiFetch<ForecastResponse>(`/forecast?${locQuery(loc)}`);
}

export async function getRisks(loc: Location): Promise<RisksResponse> {
  return apiFetch<RisksResponse>(`/risks?${locQuery(loc)}`);
}

export async function getMarket(loc: Location): Promise<MarketResponse> {
  return apiFetch<MarketResponse>(`/market?${locQuery(loc)}`);
}

export async function searchGeo(query: string): Promise<Location[]> {
  const data = await apiFetch<GeoSearchResponse>(`/geo/search?q=${encodeURIComponent(query)}`);
  return data.results || [];
}

export async function reverseGeo(lat: number, lon: number): Promise<Location> {
  return apiFetch<Location>(`/geo/reverse?lat=${lat}&lon=${lon}`);
}

export async function postChat(
  body: ChatRequest,
  opts?: { signal?: AbortSignal; onEvent?: (ev: ChatSseEvent) => void },
): Promise<{ text: string; raw: unknown; message?: ChatSseEvent['message'] }> {
  let om = getLastOmPack();
  if (!om && body.location?.lat != null && body.location?.lon != null) {
    om = await fetchClientOmPack(Number(body.location.lat), Number(body.location.lon));
  }
  const question_en =
    body.question_en || (await questionToEnglish(body.message, body.locale_hint));
  return chatRequest(
    '/chat',
    {
      ...body,
      stream: true,
      question_en,
      client_mt: clientMtPreferred(body.locale_hint),
      om: om
        ? {
            forecast: om.forecast,
            air: om.air,
            flood: om.flood,
            marine: om.marine,
            models: om.models,
            era5: om.era5,
          }
        : undefined,
      fetched_at: om?.fetched_at,
    },
    CHAT_TIMEOUT_MS,
    opts,
  );
}

export async function getMapLayers(): Promise<MapLayersResponse> {
  const { clientMapLayers } = await import('./mapCatalog');
  return clientMapLayers();
}

export async function getMapRadar(): Promise<MapRadarResponse> {
  const { fetchClientRadar } = await import('./mapCatalog');
  const local = await fetchClientRadar();
  if (local?.ok && (local.radar?.length || local.satellite?.length)) return local;
  return apiFetch<MapRadarResponse>('/map/radar');
}

export async function getMapWeatherGrid(hour = 0): Promise<MapWeatherGridResponse> {
  const h = Math.max(0, Math.min(23, Math.round(hour)));
  const { fetchClientWeatherGrid } = await import('./weatherGridClient');
  const local = await fetchClientWeatherGrid(h);
  if (local?.ok && local.fields) return local as MapWeatherGridResponse;
  throw new Error('weather grid unavailable from this device');
}

export async function getStormMap(state: string, pastH = 6): Promise<unknown> {
  return apiFetch(`/nowcast/storm-map?state=${encodeURIComponent(state)}&past_h=${pastH}`);
}

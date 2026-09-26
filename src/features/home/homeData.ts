import type { DashboardSnapshot, OutlookDay, Risk, TimeSeriesPoint, Warning } from '../../types';

export function hhmm(t: string) {
  const i = t.indexOf('T');
  return i >= 0 ? t.slice(i + 1, i + 6) : t.slice(-5);
}

export function feelsLikeC(tempC?: number | null, rh?: number | null): number | null {
  if (tempC == null) return null;
  const t = Number(tempC);
  const h = Number(rh ?? 50);
  if (t < 26) return Math.round(t * 10) / 10;
  const hi =
    -8.784695 +
    1.61139411 * t +
    2.338549 * h -
    0.14611605 * t * h -
    0.012308094 * t * t -
    0.016424828 * h * h +
    0.002211732 * t * t * h +
    0.00072546 * t * h * h -
    0.000003582 * t * t * h * h;
  return Math.round(hi * 10) / 10;
}

export function imdRainLabel(mm?: number | null): string {
  if (mm == null || Number.isNaN(Number(mm)) || Number(mm) <= 0.05) return 'Dry / Nil';
  const v = Number(mm);
  if (v < 2.5) return 'Very Light';
  if (v <= 15.5) return 'Light Rain';
  if (v <= 64.4) return 'Moderate';
  if (v <= 115.5) return 'Heavy (IMD)';
  if (v <= 204.4) return 'Very Heavy';
  return 'Extremely Heavy';
}

export function beaufort(kmh?: number | null): { force: number; label: string } {
  if (kmh == null || Number.isNaN(Number(kmh)) || Number(kmh) < 1) return { force: 0, label: 'Calm' };
  const s = Number(kmh);
  if (s <= 5) return { force: 1, label: 'Light Air' };
  if (s <= 11) return { force: 2, label: 'Light Breeze' };
  if (s <= 19) return { force: 3, label: 'Gentle Breeze' };
  if (s <= 28) return { force: 4, label: 'Moderate Breeze' };
  if (s <= 38) return { force: 5, label: 'Fresh Breeze' };
  if (s <= 49) return { force: 6, label: 'Strong Breeze' };
  if (s <= 61) return { force: 7, label: 'High Wind' };
  if (s <= 74) return { force: 8, label: 'Gale' };
  return { force: 9, label: 'Strong Gale+' };
}

export function filterHomeAlerts(raw: Warning[] | undefined): Warning[] {
  const seen = new Set<string>();
  const out: Warning[] = [];
  for (const w of raw || []) {
    const lowTitle = (w.title || '').toLowerCase().trim();
    const lowBody = (w.body || '').toLowerCase().trim();
    const combined = `${lowTitle} ${lowBody}`;
    if (w.hazard === 'tsunami' && /no threat|does not exist|all clear|nil/.test(combined)) continue;
    if (w.hazard === 'seismic' && /no damage|no threat|all clear/.test(combined)) continue;
    if (!['extreme', 'warning'].includes((w.severity || '').toLowerCase())) continue;
    const key = `${w.hazard || 'gen'}_${lowTitle.replace(/[^a-z0-9]/g, '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

export function todayRainMm(dash: DashboardSnapshot): number | null {
  const outlook = dash.predictive?.outlook_days?.[0]?.precip_mm;
  if (outlook != null) return Number(outlook);
  const daily = dash.descriptive?.series?.precip_daily?.[0]?.value;
  if (daily != null) return Number(daily);
  const sky = dash.live?.sky as { precip_1h_mm?: number } | undefined;
  if (sky?.precip_1h_mm != null) return Number(sky.precip_1h_mm);
  return dash.descriptive?.current?.precip_1h_mm ?? null;
}

export function acc3DayMm(dash: DashboardSnapshot): number | null {
  const days = dash.descriptive?.series?.precip_daily?.slice(0, 3) || [];
  if (!days.length) {
    const n = dash.predictive?.precip_next_3d_mm;
    return n != null ? Number(n) : null;
  }
  return days.reduce((s, p) => s + (Number(p.value) || 0), 0);
}

export function seriesBars(pts: TimeSeriesPoint[] | undefined, n = 8): Array<{ t: string; value: number }> {
  return (pts || []).slice(0, n).map((p) => ({ t: hhmm(p.t), value: Number(p.value) || 0 }));
}

export function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export function fmt(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
}

export function pinAqi(dash: DashboardSnapshot): { val: number | null; src: string; cat?: string | null } {
  const cur = dash.descriptive?.current;
  if (cur?.aqi != null) return { val: Number(cur.aqi), src: 'CPCB', cat: cur.aqi_category };
  const liveAir = dash.live?.air as { cpcb?: { value?: number; category?: string } } | undefined;
  if (liveAir?.cpcb?.value != null) return { val: Number(liveAir.cpcb.value), src: 'CPCB', cat: liveAir.cpcb.category };
  if (cur?.om_us_aqi != null) return { val: Number(cur.om_us_aqi), src: 'Open-Meteo', cat: null };
  return { val: null, src: '—' };
}

export function marineInland(dash: DashboardSnapshot): boolean {
  const m = dash.live?.marine as { inland?: boolean } | undefined;
  if (m?.inland != null) return Boolean(m.inland);
  return dash.descriptive?.current?.wave_height_m == null;
}

export function warningByHazard(warnings: Warning[], keys: string[]): Warning | undefined {
  return warnings.find((w) => keys.includes((w.hazard || '').toLowerCase()) || keys.some((k) => (w.title || '').toLowerCase().includes(k)));
}

export function sortedRisks(dash: DashboardSnapshot): Risk[] {
  return [...(dash.risks || [])].sort((a, b) => (b.score_pct ?? 0) - (a.score_pct ?? 0));
}

export function outlookDays(dash: DashboardSnapshot): OutlookDay[] {
  return dash.predictive?.outlook_days || [];
}

export function skySummary(dash: DashboardSnapshot, locale: string): { headline: string; badge: string; points: string[] } {
  const cur = dash.descriptive?.current;
  const raining = Number(cur?.precip_1h_mm ?? 0) > 0.5 || (cur?.sky_label || '').toLowerCase().includes('rain');
  const badge = String(cur?.sky_label || 'Sky');
  if (locale === 'hi') {
    return {
      headline: raining ? 'वर्षा और बादलों की स्थिति बनी हुई है।' : 'आसमान सामान्य और मौसम स्थिर है।',
      badge,
      points: [`आर्द्रता ${fmt(cur?.humidity_pct, 0)}%`, `बादल ${fmt(cur?.cloud_cover_pct, 0)}%`],
    };
  }
  return {
    headline: raining ? 'Rain showers and overcast skies currently active.' : 'Stable atmospheric conditions with fair skies.',
    badge,
    points: [`Humidity ${fmt(cur?.humidity_pct, 0)}%`, `Cloud cover ${fmt(cur?.cloud_cover_pct, 0)}%`],
  };
}

export function rainSummary(dash: DashboardSnapshot): { headline: string; badge: string; points: string[] } {
  const today = todayRainMm(dash);
  const label = imdRainLabel(today);
  const p7 = dash.predictive?.precip_7d_mm;
  return {
    headline: today != null && today >= 15 ? 'Heavy rain is in the 24-hour outlook for this pin.' : today != null && today > 1 ? 'Light to moderate rain is in the daily total.' : 'No significant rainfall in the daily total from the API.',
    badge: label,
    points: [`Today ${fmt(today)} mm (IMD class: ${label})`, p7 != null ? `7-day ${fmt(p7)} mm` : '7-day total not on snapshot'],
  };
}

export function windSummary(dash: DashboardSnapshot): { headline: string; badge: string; points: string[] } {
  const cur = dash.descriptive?.current;
  const kmh = cur?.wind_ms != null ? Number(cur.wind_ms) * 3.6 : null;
  const b = beaufort(kmh);
  return {
    headline: `Surface wind ${fmt(kmh)} km/h from ${cur?.wind_compass || '—'} (${b.label}).`,
    badge: b.label,
    points: [`Beaufort F${b.force}`, cur?.wind_dir_deg != null ? `Direction ${fmt(cur.wind_dir_deg, 0)}°` : 'Direction from compass'],
  };
}

export function alertsSummary(dash: DashboardSnapshot): { headline: string; badge: string; points: string[] } {
  const n = filterHomeAlerts(dash.prescriptive?.warnings).length;
  const top = sortedRisks(dash)[0];
  return {
    headline: n === 0 ? 'No severe weather bulletins active in this jurisdiction.' : `${n} meteorological advisories currently in effect.`,
    badge: n === 0 ? 'Normal' : 'Advisory',
    points: [top ? `Dominant risk ${top.label} ${Math.round(top.score_pct)}%` : 'No dominant risk card', 'Tap a cluster to switch the dashboard pin'],
  };
}

export function istClock(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

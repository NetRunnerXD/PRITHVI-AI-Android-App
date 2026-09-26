/** Device-side public feeds so Render’s shared IP is not used. NASA POWER stays off. */

export const NASA_OFF_DEFAULT = ['nasa-power', 'nasa-power-clim'] as const;

const FC_CURRENT =
  'temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,is_day,visibility,pressure_msl,surface_pressure';
const FC_HOURLY =
  'temperature_2m,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,soil_moisture_0_to_7cm,et0_fao_evapotranspiration,evapotranspiration,relative_humidity_2m,dew_point_2m,apparent_temperature,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,visibility,cape,vapour_pressure_deficit,shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,is_day,temperature_80m,temperature_120m,temperature_180m,wind_speed_80m,wind_speed_120m,wind_speed_180m,wind_direction_80m,wind_direction_120m,wind_direction_180m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_27_to_81cm';
const FC_DAILY =
  'precipitation_sum,precipitation_probability_max,precipitation_hours,rain_sum,showers_sum,snowfall_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,relative_humidity_2m_max,relative_humidity_2m_min,relative_humidity_2m_mean,dew_point_2m_max,dew_point_2m_min,dew_point_2m_mean,et0_fao_evapotranspiration,weather_code,wind_speed_10m_max,wind_speed_10m_mean,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset,daylight_duration,sunshine_duration,shortwave_radiation_sum,uv_index_max,uv_index_clear_sky_max';

export type OmClientPack = {
  forecast: Record<string, unknown>;
  air?: Record<string, unknown> | null;
  flood?: Record<string, unknown> | null;
  marine?: Record<string, unknown> | null;
  models?: Record<string, unknown> | null;
  era5?: Record<string, unknown> | null;
  fetched_at: number;
};

let lastOmPack: OmClientPack | null = null;

export function getLastOmPack(): OmClientPack | null {
  return lastOmPack;
}

async function omJson(url: string, timeoutMs = 8000): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' && !(data as { error?: unknown }).error
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function omQuery(lat: number, lon: number, extra: Record<string, string>) {
  return new URLSearchParams({ latitude: String(lat), longitude: String(lon), ...extra }).toString();
}

export async function fetchClientOmPack(
  lat: number,
  lon: number,
  opts?: { extras?: boolean },
): Promise<OmClientPack | null> {
  const extras = Boolean(opts?.extras);
  const q = (extra: Record<string, string>) => omQuery(lat, lon, extra);

  if (!extras) {
    const [forecast, air] = await Promise.all([
      omJson(
        `https://api.open-meteo.com/v1/forecast?${q({
          current: FC_CURRENT,
          hourly: FC_HOURLY,
          past_days: '1',
          daily: FC_DAILY,
          timezone: 'Asia/Kolkata',
          forecast_days: '7',
        })}`,
        8000,
      ),
      omJson(
        `https://air-quality-api.open-meteo.com/v1/air-quality?${q({
          current: 'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
          hourly: 'us_aqi',
          forecast_hours: '24',
          timezone: 'Asia/Kolkata',
        })}`,
        6000,
      ),
    ]);
    if (!forecast) return lastOmPack;
    lastOmPack = {
      forecast,
      air,
      flood: lastOmPack?.flood ?? null,
      marine: lastOmPack?.marine ?? null,
      models: lastOmPack?.models ?? null,
      era5: lastOmPack?.era5 ?? null,
      fetched_at: Date.now() / 1000,
    };
    const { saveOmPack } = await import('./persist');
    void saveOmPack(lat, lon, lastOmPack);
    return lastOmPack;
  }

  const marineVars =
    'wave_height,wave_direction,wave_period,wave_peak_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_level_height_msl,sea_surface_temperature,ocean_current_velocity,ocean_current_direction';

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 15);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [flood, marine, models, era5] = await Promise.all([
    omJson(
      `https://flood-api.open-meteo.com/v1/flood?${q({
        daily: 'river_discharge,river_discharge_mean,river_discharge_max',
        forecast_days: '7',
      })}`,
      4000,
    ),
    omJson(
      `https://marine-api.open-meteo.com/v1/marine?${q({
        current: marineVars,
        hourly: marineVars,
        forecast_days: '3',
        timezone: 'Asia/Kolkata',
      })}`,
      4000,
    ),
    omJson(
      `https://api.open-meteo.com/v1/forecast?${q({
        daily:
          'precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,shortwave_radiation_sum',
        hourly:
          'precipitation,temperature_2m,wind_speed_10m,wind_gusts_10m,shortwave_radiation,visibility,relative_humidity_2m',
        forecast_days: '7',
        timezone: 'Asia/Kolkata',
        models:
          'ecmwf_ifs025,ecmwf_aifs025,gfs_global,gfs_graphcast025,icon_global,icon_seamless,ukmo_global_deterministic_10km',
      })}`,
      4000,
    ),
    omJson(
      `https://archive-api.open-meteo.com/v1/archive?${q({
        start_date: iso(start),
        end_date: iso(end),
        hourly: 'precipitation,temperature_2m,geopotential_height_500hPa,pressure_msl',
        daily: 'precipitation_sum',
        timezone: 'Asia/Kolkata',
        models: 'era5_seamless',
      })}`,
      4000,
    ),
  ]);

  if (!lastOmPack?.forecast) {
    const fast = await fetchClientOmPack(lat, lon, { extras: false });
    if (!fast) return null;
  }
  lastOmPack = {
    ...(lastOmPack as OmClientPack),
    flood,
    marine,
    models,
    era5,
    fetched_at: Date.now() / 1000,
  };
  const { saveOmPack } = await import('./persist');
  void saveOmPack(lat, lon, lastOmPack);
  return lastOmPack;
}

export async function fetchUsgsIndiaCsv(timeoutMs = 4000): Promise<string | null> {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 14);
  const q = new URLSearchParams({
    format: 'csv',
    minlatitude: '6.5',
    maxlatitude: '37.5',
    minlongitude: '68',
    maxlongitude: '97.5',
    orderby: 'time',
    limit: '20',
    starttime: start.toISOString().slice(0, 10),
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${q}`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const text = await r.text();
    return text.includes('latitude') ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { questionToEnglish } from './onDeviceMt';

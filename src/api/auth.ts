import { API_BASE, API_PREFIX } from './config';
import { getAuthToken, saveAuthToken } from './persist';

export type AuthLocation = {
  lat: number;
  lon: number;
  place?: string | null;
  district?: string | null;
  state?: string | null;
  captured_at?: string | null;
  source?: string | null;
};

export type AuthUser = {
  id: string;
  phone: string;
  display_name: string;
  email?: string | null;
  sms_opt_in: boolean;
  location: AuthLocation | null;
};

function authUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/api')) return `${API_BASE}${p}`;
  return `${API_BASE}${API_PREFIX}${p}`;
}

function detailFromBody(body: unknown, fallback: string): string {
  const d = (body as { detail?: unknown } | null)?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const joined = d
      .map((x: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(x.loc) ? x.loc.filter((p) => p !== 'body').join('.') : '';
        return field && x.msg ? `${field}: ${x.msg}` : x.msg || '';
      })
      .filter(Boolean)
      .join('; ');
    if (joined) return joined;
  }
  return fallback;
}

async function authFetch(path: string, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(authUrl(path), { ...init, headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(detailFromBody(body, r.statusText || 'auth_error'));
  }
  return body;
}

export async function registerAccount(p: {
  phone: string;
  password: string;
  display_name?: string;
  sms_opt_in: boolean;
  lat?: number;
  lon?: number;
  place?: string;
  email?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const payload: Record<string, unknown> = {
    phone: p.phone.trim(),
    password: p.password,
    sms_opt_in: Boolean(p.sms_opt_in),
  };
  if (p.display_name?.trim()) payload.display_name = p.display_name.trim();
  if (p.email?.trim()) payload.email = p.email.trim();
  if (p.lat != null && p.lon != null) {
    payload.lat = p.lat;
    payload.lon = p.lon;
  }
  if (p.place?.trim()) payload.place = p.place.trim();
  const body = await authFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  await saveAuthToken(body.token);
  return body;
}

export async function loginAccount(phone: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const body = await authFetch('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  await saveAuthToken(body.token);
  return body;
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (!getAuthToken()) return null;
  try {
    const body = await authFetch('/auth/me');
    return body.user as AuthUser;
  } catch {
    await saveAuthToken(null);
    return null;
  }
}

export async function patchProfile(
  p: Partial<{ display_name: string; email: string; sms_opt_in: boolean }>,
): Promise<AuthUser> {
  const body = await authFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(p) });
  return body.user as AuthUser;
}

export async function patchAlertLocation(p: {
  lat: number;
  lon: number;
  place?: string;
  source?: 'gps' | 'manual';
}): Promise<AuthUser> {
  const body = await authFetch('/auth/me/location', { method: 'PATCH', body: JSON.stringify(p) });
  return body.user as AuthUser;
}

export async function forgotPassword(phone: string) {
  return authFetch('/auth/forgot', { method: 'POST', body: JSON.stringify({ phone }) });
}

export async function resetPassword(
  phone: string,
  otp: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const body = await authFetch('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, password }),
  });
  await saveAuthToken(body.token);
  return body;
}

export async function logoutAccount() {
  try {
    if (getAuthToken()) await authFetch('/auth/logout', { method: 'POST' });
  } catch {
    /* still drop local token */
  }
  await saveAuthToken(null);
}

export async function gpsFix(): Promise<{ lat: number; lon: number } | null> {
  try {
    const LocationApi = require('expo-location');
    const perm = await LocationApi.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await LocationApi.getCurrentPositionAsync({ accuracy: LocationApi.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

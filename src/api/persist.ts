import type { DashboardSnapshot, Location } from '../types';

const KEY_LOC = 'prithvi.location';
const KEY_DASH = 'prithvi.dashboard';

export function pinCacheKey(lat: number, lon: number, locale = 'en'): string {
  const la = (Math.round(lat / 0.05) * 0.05).toFixed(2);
  const lo = (Math.round(lon / 0.05) * 0.05).toFixed(2);
  return `prithvi.dash:${la}:${lo}:${locale}`;
}

type Store = {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem?(k: string): Promise<void>;
};

function memoryStore(): Store {
  const m = new Map<string, string>();
  return {
    async getItem(k) {
      return m.get(k) ?? null;
    },
    async setItem(k, v) {
      m.set(k, v);
    },
  };
}

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (store) return store;
  let next: Store = memoryStore();
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default as Store;
    next = AsyncStorage;
  } catch {
    /* memory */
  }
  store = next;
  return next;
}

export async function loadLocation(): Promise<Location | null> {
  try {
    const raw = await (await getStore()).getItem(KEY_LOC);
    return raw ? (JSON.parse(raw) as Location) : null;
  } catch {
    return null;
  }
}

export async function saveLocation(loc: Location): Promise<void> {
  try {
    await (await getStore()).setItem(KEY_LOC, JSON.stringify(loc));
  } catch {
    /* ignore */
  }
}

export async function loadDashboardCache(
  lat?: number,
  lon?: number,
  locale = 'en',
): Promise<DashboardSnapshot | null> {
  try {
    const s = await getStore();
    if (lat != null && lon != null) {
      const raw = await s.getItem(pinCacheKey(lat, lon, locale));
      if (raw) return JSON.parse(raw) as DashboardSnapshot;
    }
    const legacy = await s.getItem(KEY_DASH);
    if (!legacy) return null;
    const snap = JSON.parse(legacy) as DashboardSnapshot;
    if (lat != null && lon != null && snap?.location) {
      const dlat = Math.abs(Number(snap.location.lat) - lat);
      const dlon = Math.abs(Number(snap.location.lon) - lon);
      if (dlat > 0.06 || dlon > 0.06) return null;
    }
    return snap;
  } catch {
    return null;
  }
}

const KEY_FAV = 'prithvi.favorites';

export async function loadFavorites(): Promise<string[]> {
  try {
    const raw = await (await getStore()).getItem(KEY_FAV);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(ids: string[]): Promise<void> {
  try {
    await (await getStore()).setItem(KEY_FAV, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export async function saveDashboardCache(
  snap: unknown,
  loc?: { lat?: number; lon?: number },
  locale = 'en',
): Promise<void> {
  try {
    const s = await getStore();
    const blob = JSON.stringify(snap);
    await s.setItem(KEY_DASH, blob);
    const lat = loc?.lat ?? (snap as DashboardSnapshot)?.location?.lat;
    const lon = loc?.lon ?? (snap as DashboardSnapshot)?.location?.lon;
    if (lat != null && lon != null) {
      await s.setItem(pinCacheKey(Number(lat), Number(lon), locale), blob);
    }
  } catch {
    /* ignore */
  }
}

const KEY_OM = 'prithvi.om';

export async function saveOmPack(lat: number, lon: number, pack: unknown): Promise<void> {
  try {
    const la = (Math.round(lat / 0.05) * 0.05).toFixed(2);
    const lo = (Math.round(lon / 0.05) * 0.05).toFixed(2);
    await (await getStore()).setItem(`${KEY_OM}:${la}:${lo}`, JSON.stringify(pack));
  } catch {
    /* ignore */
  }
}

export async function loadOmPack(lat: number, lon: number): Promise<unknown | null> {
  try {
    const la = (Math.round(lat / 0.05) * 0.05).toFixed(2);
    const lo = (Math.round(lon / 0.05) * 0.05).toFixed(2);
    const raw = await (await getStore()).getItem(`${KEY_OM}:${la}:${lo}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const KEY_AUTH = 'prithvi.auth';
let authTokenCache: string | null = null;

export function getAuthToken(): string | null {
  return authTokenCache;
}

export async function hydrateAuthToken(): Promise<string | null> {
  try {
    const raw = await (await getStore()).getItem(KEY_AUTH);
    authTokenCache = raw || null;
    return authTokenCache;
  } catch {
    authTokenCache = null;
    return null;
  }
}

export async function saveAuthToken(token: string | null): Promise<void> {
  authTokenCache = token;
  try {
    const s = await getStore();
    if (token) await s.setItem(KEY_AUTH, token);
    else if (s.removeItem) await s.removeItem(KEY_AUTH);
    else await s.setItem(KEY_AUTH, '');
  } catch {
    /* ignore */
  }
}

const KEY_CHAT = 'prithvi.chat';

export type PersistedChat = {
  conversationId: string;
  messages: unknown[];
};

export async function loadChat(): Promise<PersistedChat | null> {
  try {
    const raw = await (await getStore()).getItem(KEY_CHAT);
    return raw ? (JSON.parse(raw) as PersistedChat) : null;
  } catch {
    return null;
  }
}

export async function saveChat(payload: PersistedChat): Promise<void> {
  try {
    await (await getStore()).setItem(KEY_CHAT, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

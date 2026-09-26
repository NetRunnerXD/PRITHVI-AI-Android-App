/** Live hosted API. Do not default to a local uvicorn. */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE || 'https://rituchakra-api.onrender.com'
).replace(/\/$/, '');

/** Canonical prefix on the Render host. /app/v1 is an alias — do not mix. */
export const API_PREFIX = '/api';

export const DEFAULT_TIMEOUT_MS = 30_000;
export const CHAT_TIMEOUT_MS = 180_000;
export const READY_TIMEOUT_MS = 20_000;

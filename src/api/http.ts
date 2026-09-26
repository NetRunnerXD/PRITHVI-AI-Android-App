import { API_BASE, API_PREFIX, DEFAULT_TIMEOUT_MS } from './config';
import { getAuthToken } from './persist';

export type DataSource = 'live' | 'fallback' | 'error';
export let lastDataSource: DataSource = 'live';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function joinUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/api') || p.startsWith('/app/v1') || p.startsWith('/v1')) {
    return `${API_BASE}${p}`;
  }
  return `${API_BASE}${API_PREFIX}${p.startsWith('/') ? p : `/${p}`}`;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeout?: number },
): Promise<T> {
  const url = joinUrl(path);
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const token = getAuthToken();
    const res = await fetch(url, {
      ...options,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errJson = await res.json();
        detail = JSON.stringify(errJson);
      } catch {
        /* keep statusText */
      }
      lastDataSource = 'error';
      throw new ApiError(`HTTP ${res.status}: ${detail}`, res.status);
    }
    lastDataSource = 'live';
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    lastDataSource = 'error';
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timeout (${timeoutMs}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type ChatSseEvent = {
  type?: string;
  message?: {
    content?: string;
    content_en?: string;
    locale?: string;
    blocks?: unknown[];
    suggestions?: unknown[];
    citations?: unknown[];
    ui?: unknown[];
    insight?: unknown;
    id?: string;
  };
  content?: string;
  delta?: string;
  question_en?: string;
  location?: { label?: string };
  path?: string;
  value?: unknown;
};

function ingestSseBlock(
  block: string,
  onEvent?: (ev: ChatSseEvent) => void,
): ChatSseEvent | null {
  const line = block
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .join('');
  if (!line || line === '[DONE]') return null;
  try {
    const ev = JSON.parse(line) as ChatSseEvent;
    onEvent?.(ev);
    return ev;
  } catch {
    return null;
  }
}

function textFromEvent(ev: ChatSseEvent | null, prev: string): string {
  if (!ev) return prev;
  if (ev.type === 'final' && ev.message?.content) return ev.message.content;
  if (typeof ev.message?.content === 'string' && ev.message.content) return ev.message.content;
  if (typeof ev.delta === 'string' && ev.delta) return prev + ev.delta;
  if (typeof ev.content === 'string' && ev.content) return ev.content;
  return prev;
}

/** POST /api/chat — prefer SSE; fall back to JSON body. */
export async function chatRequest(
  path: string,
  body: unknown,
  timeoutMs: number,
  opts?: { signal?: AbortSignal; onEvent?: (ev: ChatSseEvent) => void },
): Promise<{ text: string; raw: unknown; message?: ChatSseEvent['message'] }> {
  const url = joinUrl(path);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onUserAbort = () => ctrl.abort();
  opts?.signal?.addEventListener('abort', onUserAbort);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/event-stream, application/json',
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = JSON.stringify(await res.json());
      } catch {
        /* ignore */
      }
      throw new ApiError(`HTTP ${res.status}: ${detail}`, res.status);
    }
    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let text = '';
      let raw: unknown = null;
      let message: ChatSseEvent['message'] | undefined;
      const eat = (block: string) => {
        const ev = ingestSseBlock(block, opts?.onEvent);
        if (!ev) return;
        raw = ev;
        text = textFromEvent(ev, text);
        if (ev.message) message = ev.message;
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split('\n\n');
        buf = chunks.pop() || '';
        for (const block of chunks) eat(block);
      }
      buf += decoder.decode();
      if (buf.trim()) eat(buf);
      lastDataSource = 'live';
      return { text: text || 'No reply.', raw, message };
    }
    const json = (await res.json()) as {
      message?: ChatSseEvent['message'];
      events?: ChatSseEvent[];
    };
    lastDataSource = 'live';
    const fromEvents = [...(json.events || [])].reverse().find((e) => e?.message?.content);
    if (json.events) {
      for (const ev of json.events) opts?.onEvent?.(ev);
    }
    const text = json.message?.content || fromEvents?.message?.content || 'No reply.';
    return { text, raw: json, message: json.message || fromEvents?.message };
  } catch (err) {
    if (opts?.signal?.aborted) {
      throw new ApiError('Cancelled');
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timeout (${timeoutMs}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    opts?.signal?.removeEventListener('abort', onUserAbort);
  }
}

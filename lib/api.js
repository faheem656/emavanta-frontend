/**
 * Client for the internal dashboard service.
 * Network problems are surfaced as a typed `ApiOfflineError` so the UI can show a
 * real "backend is not running" state instead of a vague retry message.
 */
const token = () => typeof window !== 'undefined' ? (window.localStorage?.getItem('emavanta_token') || '') : '';

export class ApiOfflineError extends Error {
  constructor(message = 'The Emavanta API is not reachable.') {
    super(message);
    this.name = 'ApiOfflineError';
    this.code = 'API_OFFLINE';
    this.offline = true;
  }
}

export const REQUIRED_API_SCHEMA = 12;

const OFFLINE_MESSAGE = 'Cannot reach the service. Please retry or contact support if the problem continues.';

let lastOfflineEvent = 0;
const announce = online => {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (!online && now - lastOfflineEvent < 1500) return;
  if (!online) lastOfflineEvent = now;
  window.dispatchEvent(new CustomEvent(online ? 'emavanta:api-online' : 'emavanta:api-offline'));
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function request(path, options = {}, attempt = 0) {
  let res;
  const method = String(options.method || 'GET').toUpperCase();
  const safeToRetry = method === 'GET' || method === 'HEAD';
  const publicAuth = /^\/auth\/(?:register|login(?:\/mfa)?|verify-otp(?:\/resend)?|password\/(?:forgot|reset(?:\/check)?))$/.test(path.split('?')[0]);
  const sentToken = !publicAuth ? token() : '';
  try {
    const body = options.body;
    const hasBody = method !== 'GET' && method !== 'HEAD' && typeof body === 'string' && body.length > 0;
    const headers = { ...(sentToken ? { authorization: `Bearer ${sentToken}` } : {}), ...(options.headers || {}) };
    if (hasBody && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) headers['content-type'] = 'application/json';
    const emailRequest = /^\/auth\/(?:register|login|verify-otp(?:\/resend)?|password\/forgot)/.test(path);
    const config = { ...options, method, headers, cache: 'no-store', signal: AbortSignal.timeout?.(emailRequest ? 60000 : 18000) };
    if (!hasBody) delete config.body;
    res = await fetch(`/api/v1${path}`, config);
  } catch {
    if (safeToRetry && attempt < 2) { await sleep(400 * (attempt + 1)); return request(path, options, attempt + 1); }
    announce(false);
    throw new ApiOfflineError(safeToRetry ? OFFLINE_MESSAGE : 'Connection lost or request timed out. The action may have completed; check its status before trying again.');
  }
  const raw = await res.text().catch(() => '');
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
  if (!res.ok) {
    if(res.status===503 && payload?.error?.code==='DATABASE_UNAVAILABLE') {
      announce(false);const e=new Error('Database connection is temporarily unavailable. If you submitted an action, check its status before trying again.');e.status=503;e.code='DATABASE_UNAVAILABLE';throw e;
    }
    if (safeToRetry && res.status >= 500 && attempt < 2) { await sleep(400 * (attempt + 1)); return request(path, options, attempt + 1); }
    if (res.status === 401 && path.split('?')[0] !== '/auth/me' && sentToken && token() === sentToken && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('emavanta:session-invalid'));
    // 502/503/504 always mean the proxy could not reach the API. A 500 without our
    // structured error envelope means the dev proxy failed too (API down or stale build),
    // so confirm with a health probe before blaming the user's action.
    const looksLikeOurError = !!payload?.error?.message;
    if ([502, 503, 504].includes(res.status) || (res.status >= 500 && !looksLikeOurError)) {
      const probe = await fetch('/api/v1/health', { cache: 'no-store' }).then(r => r.ok).catch(() => false);
      if (!probe) { announce(false); throw new ApiOfflineError(OFFLINE_MESSAGE); }
    }
    announce(true);
    const rawMessage = payload?.error?.message || `Request failed: ${res.status}`;
    const staleBackend = res.status === 404 && /route not found/i.test(rawMessage);
    // Keep this in plain language: users should never read build/deploy instructions.
    const error = new Error(staleBackend
      ? 'This action needs a newer server build than the page has. Reload the page and try again.'
      : rawMessage);
    error.status = res.status;
    error.code = payload?.error?.code;
    error.stale = staleBackend;
    // field-level details (e.g. which card field is wrong) must survive to the form
    error.details = payload?.error?.details || null;
    if (res.status === 402 || error.code === 'SEAT_LIMIT' || error.code === 'LIMIT_REACHED') error.limit = true;
    throw error;
  }
  announce(true);
  return payload;
}

/** An empty array that also behaves like an empty object so any page can render during startup. */
const safeEmpty = () => Object.assign([], {
  items: [], builtIn: [], custom: [], plans: [], addons: {}, stats: {}, events: {},
  queues: {}, used: {}, slos: {}, metrics: {}, runbooks: {}, ok: false, demo: true
});

export const api = (path, options = {}) => request(path, options);
export const get = path => api(path).catch(() => safeEmpty());
/** Strict GET: fails loudly (used where an empty state would be misleading). */
export const getStrict = path => api(path);
export const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data || {}) });
export const patch = (path, data) => api(path, { method: 'PATCH', body: JSON.stringify(data || {}) });
export const put = (path, data) => api(path, { method: 'PUT', body: JSON.stringify(data || {}) });
export const del = (path, data) => api(path, { method: 'DELETE', ...(data ? { body: JSON.stringify(data) } : {}) });

/** Ping the API through the same proxy path the dashboard uses. */
export const health = async () => {
  try {
    const res = await fetch('/api/v1/health', { cache: 'no-store', signal: AbortSignal.timeout?.(6000) });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json().catch(() => ({}));
    const databaseUnavailable=body.storage==='mongo' && body.db?.connected===false;
    if(databaseUnavailable)announce(false);else announce(true);
    const outdated = Number(body.schema || 0) < REQUIRED_API_SCHEMA;
    return { ...body, ok: !outdated && !databaseUnavailable, status: res.status, outdated, databaseUnavailable };
  } catch {
    announce(false);
    return { ok: false, status: 0 };
  }
};

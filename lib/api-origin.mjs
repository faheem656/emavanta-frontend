/** One origin for Next's proxy and server-rendered forms. No path or credentials. */
export function resolveApiOrigin(env = process.env) {
  if (env.NODE_ENV === 'production' && !String(env.API_ORIGIN || '').trim()) throw new Error('API_ORIGIN must be set to the backend origin in frontend environment before build');
  const value = String(env.API_ORIGIN || `http://127.0.0.1:${env.API_PORT || 4000}`).trim();
  let url;
  try { url = new URL(value); } catch { throw new Error('API_ORIGIN must be an absolute http(s) origin, for example https://api.example.com'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('API_ORIGIN must contain only an http(s) origin, without credentials, path, query or fragment');
  }
  // Normalize localhost to IPv4 for local Node installs where IPv6 is resolved first.
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.origin;
}

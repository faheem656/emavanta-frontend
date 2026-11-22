/** Public frontend origin for canonical URLs, sitemap and robots. */
export function resolveSiteOrigin(env = process.env) {
  const supplied = String(env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (env.NODE_ENV === 'production' && !supplied) throw new Error('NEXT_PUBLIC_SITE_URL must be set to the public frontend origin in frontend environment before build');
  let url;
  try { url = new URL(supplied || 'http://localhost:3000'); }
  catch { throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute http(s) origin'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must contain only an http(s) origin, without credentials, path, query or fragment');
  }
  return url.origin;
}

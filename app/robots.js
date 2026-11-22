import { resolveSiteOrigin } from '../lib/site-origin.mjs';
export default function robots() {
  const base = resolveSiteOrigin();
  return { rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/', '/f/', '/invite', '/signin', '/signup', '/forgot-password', '/reset-password', '/verify-email'] }, sitemap: `${base}/sitemap.xml` };
}

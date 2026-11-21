export default function robots() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://emavanta.com').replace(/\/$/, '');
  return { rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/', '/f/', '/invite', '/signin', '/signup', '/forgot-password', '/reset-password', '/verify-email'] }, sitemap: `${base}/sitemap.xml` };
}

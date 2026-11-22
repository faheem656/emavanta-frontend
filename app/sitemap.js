const paths = ['', '/features', '/features/agency', '/features/analytics', '/features/automation', '/features/campaigns', '/features/deliverability', '/features/outreach', '/features/templates', '/pricing', '/about', '/contact', '/status', '/changelog', '/legal/privacy', '/legal/terms', '/legal/cookies'];
export default function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://emavanta.com').replace(/\/$/, '');
  return paths.map(path => ({ url: `${base}${path || '/'}` }));
}

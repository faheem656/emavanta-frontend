import { resolveSiteOrigin } from '../lib/site-origin.mjs';
const paths = ['', '/features', '/features/agency', '/features/analytics', '/features/automation', '/features/campaigns', '/features/deliverability', '/features/outreach', '/features/templates', '/pricing', '/about', '/contact', '/status', '/changelog', '/legal/privacy', '/legal/terms', '/legal/cookies'];
export default function sitemap() {
  const base = resolveSiteOrigin();
  return paths.map(path => ({ url: `${base}${path || '/'}` }));
}

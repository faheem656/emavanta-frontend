import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
// Windows/macOS often resolve `localhost` to ::1 while the API binds IPv4-only,
// which makes every proxied call fail with ECONNREFUSED. Use the literal IPv4
// loopback address by default; override with API_ORIGIN when needed.
// NOTE: never use process.env.PORT here — that is the *website* port on most hosts,
// and proxying to yourself produces an endless loop (socket hang up).
const rawOrigin = process.env.API_ORIGIN || `http://127.0.0.1:${process.env.API_PORT || 4000}`;
const origin = rawOrigin.replace('//localhost', '//127.0.0.1');

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  async rewrites() {
    return [
      { source: '/u/:path*', destination: `${origin}/u/:path*` },
      { source: '/t/:path*', destination: `${origin}/t/:path*` },
      { source: '/api/:path*', destination: `${origin}/api/:path*` }
    ];
  },
  async redirects() {
    return [
      // Legacy/marketing links (and any Stripe return URL from an older deploy)
      { source: '/billing', destination: '/dashboard/billing', permanent: false },
      { source: '/billing/:path*', destination: '/dashboard/billing', permanent: false },
      { source: '/checkout', destination: '/dashboard/billing?checkout=1', permanent: false },
      { source: '/inbox', destination: '/dashboard', permanent: false },
      { source: '/tracking', destination: '/dashboard/campaigns', permanent: false }
    ];
  }
};
export default nextConfig;

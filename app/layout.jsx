import { resolveSiteOrigin } from '../lib/site-origin.mjs';
import './globals.css';
import '../styles/design.css';
export const metadata = {
  title: 'Emavanta — Your email engine. Your accounts.',
  description: 'Cold outreach, campaigns, personalization and human-like cadence for teams who own their sending. Not an ESP.',
  metadataBase: new URL(resolveSiteOrigin()),
  openGraph: { type: 'website', siteName: 'Emavanta' },
  twitter: { card: 'summary' }
};
export default function RootLayout({ children }) {
  return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
}

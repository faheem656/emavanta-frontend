import '../../styles/marketing.css';
import AuthGuestGate from '../../components/AuthGuestGate';

/**
 * Auth pages live outside the marketing chrome: no nav bar, no footer — the split screen
 * fills the viewport, which is what makes sign in / sign up feel like a product surface.
 */
export const metadata = { robots: { index: false, follow: false } };
export default function AuthLayout({ children }) {
  return <div className="mkt au-root"><AuthGuestGate>{children}</AuthGuestGate></div>;
}

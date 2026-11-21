export const metadata={description: 'Read the Emavanta cookie policy.', alternates: { canonical: '/legal/cookies' }, title:'Cookie Policy — Emavanta'};
export default function Cookies(){return <>
 <section className="hero2 container"><div className="badge">Legal</div><h1 style={{fontSize:46}}>Cookie Policy</h1>
  <p className="lead">What the site stores in your browser and why.</p></section>
 <section className="section container prose">
  <div className="legal-note">We keep cookie use minimal. The dashboard uses an httpOnly, Secure, SameSite session cookie in production; this public site currently needs no advertising cookies.</div>
  <h2>Essential</h2>
  <p>Session authentication keeps you signed in. These cookies are required for the dashboard to work and cannot be switched off in the product.</p>
  <h2>Preferences</h2>
  <p>Interface state such as sidebar width and theme preference may be stored locally in your browser. This is not used for tracking.</p>
  <h2>Analytics</h2>
  <p>We do not set advertising or cross-site tracking cookies on the public site. Product analytics, when enabled in a self-hosted deployment, is configured by the workspace owner.</p>
  <h2>Payments</h2>
  <p>Stripe handles checkout and may set its own cookies on its hosted pages. We never store card numbers on Emavanta servers. See Stripe's privacy notice for their practices.</p>
  <h2>Your choices</h2>
  <p>You can clear cookies and local storage in your browser at any time. Clearing the session cookie signs you out.</p>
  <h2>Contact</h2>
  <p>Questions: <a href="mailto:privacy@emavanta.com">privacy@emavanta.com</a>.</p>
 </section>
</>;}

'use client';
import Link from 'next/link';

/**
 * Shared frame for sign-in, sign-up, password help and email verification.
 *
 * One layout, one set of field styles, one place to fix responsiveness — so the auth
 * pages cannot drift apart as each gains features (2FA, verification, recovery codes).
 */
export default function AuthShell({ eyebrow, title, highlight, lead, bullets = [], children, footer = null }) {
  return <div className="au-page">
    <section className="au-left">
      <Link className="au-brand" href="/">
        <img src="/emavanta-logo.webp" alt="Emavanta" />
      </Link>
      <div className="au-copy">
        <span className="au-eyebrow">{eyebrow}</span>
        <h1>{title}{highlight ? <><br /><span className="grad">{highlight}</span></> : null}</h1>
        {lead ? <p className="au-lead">{lead}</p> : null}
        {bullets.length ? <ul className="au-bullets">
          {bullets.map(b => <li key={b}><span className="au-tick" aria-hidden="true">✓</span>{b}</li>)}
        </ul> : null}
      </div>
      <div className="au-foot">
        <span>Your sending accounts stay yours.</span>
        <span className="au-dot" />
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/status">Status</Link>
      </div>
    </section>
    <section className="au-right">
      <div className="au-card">
        {children}
      </div>
      {footer}
    </section>
  </div>;
}

/** A labelled input with an inline error slot — every auth field uses the same shape. */
export function AuthField({ label, error, hint, children }) {
  return <label className={`au-field ${error ? 'has-error' : ''}`}>
    <span className="au-label">{label}</span>
    {children}
    {error ? <span className="au-error">{error}</span> : hint ? <span className="au-hint">{hint}</span> : null}
  </label>;
}

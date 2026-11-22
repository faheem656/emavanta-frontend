'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  ['/features/outreach', 'Outreach'], ['/features/campaigns', 'Campaigns'], ['/features/templates', 'Templates'],
  ['/features/deliverability', 'Deliverability'], ['/features/agency', 'Agency'], ['/pricing', 'Pricing'], ['/about', 'About'], ['/contact', 'Contact']
];

export default function MarketingNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // close on navigation and on Escape
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return <>
    <nav className="nav">
      <Link href="/" className="logo" aria-label="Emavanta home">
        <img className="logo-wordmark" src="/emavanta-logo.webp" alt="Emavanta" />
      </Link>
      <div className="nav-links">{links.map(([h, l]) => <Link key={h} href={h} style={{ color: path === h ? '#2563eb' : undefined }}>{l}</Link>)}</div>
      <div className="nav-cta">
        <Link href="/signin" className="btn secondary">Sign in</Link>
        <Link href="/signup" className="btn">Start free</Link>
      </div>
      <button
        type="button"
        className="nav-burger"
        aria-expanded={open}
        aria-controls="mkt-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen(v => !v)}
      >
        <span className={'nav-burger-bars' + (open ? ' is-open' : '')} aria-hidden="true"><i /><i /><i /></span>
      </button>
    </nav>

    <div className="nav-scrim" hidden={!open} onClick={() => setOpen(false)} aria-hidden="true" />
    <div id="mkt-menu" className={'nav-sheet' + (open ? ' is-open' : '')} hidden={!open}>
      <div className="nav-sheet-links">
        {links.map(([h, l]) => <Link key={h} href={h} className={path === h ? 'is-active' : undefined}>{l}</Link>)}
      </div>
      <div className="nav-sheet-cta">
        <Link href="/signin" className="btn secondary">Sign in</Link>
        <Link href="/signup" className="btn">Create your workspace</Link>
      </div>
    </div>
  </>;
}

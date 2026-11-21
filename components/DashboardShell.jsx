'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from './Icon';
import ConnectionStatus from './ConnectionStatus';
import { get, getStrict, post } from '../lib/api';
import ToastProvider from './ToastProvider';

/**
 * Related pages live in one collapsible group, so the menu stays short and readable
 * instead of being a 19-item list. Open/closed state is remembered per group.
 */
/**
 * Which nav item is "the page you are on".
 *
 * `/dashboard` is a prefix of every other route, so a naive `startsWith` marked Overview
 * active on every single page (the bug the user reported). Overview now matches exactly;
 * every other item matches itself and its children.
 */
const isActivePath = (href, path) => href === '/dashboard' ? path === '/dashboard' : (path === href || path.startsWith(`${href}/`));

const NAV = [
  { key: 'home', label: null, items: [['/dashboard', 'Overview', 'home']] },
  { key: 'campaigns', label: 'Campaigns', icon: 'send', items: [
    ['/dashboard/campaigns', 'Campaigns', 'send'],
    ['/dashboard/templates', 'Templates', 'mail'],
    ['/dashboard/automation', 'Automation', 'refresh']
  ] },
  { key: 'audience', label: 'Audience', icon: 'contacts', items: [
    ['/dashboard/contacts', 'Contacts', 'contacts'],
    ['/dashboard/segments', 'Segments', 'contacts'],
    ['/dashboard/imports', 'Imports', 'download'],
    ['/dashboard/forms', 'Forms', 'mail'],
    ['/dashboard/consent', 'Consent', 'shield'],
    ['/dashboard/crm', 'CRM', 'users']
  ] },
  { key: 'deliverability', label: 'Deliverability', icon: 'shield', items: [
    ['/dashboard/accounts', 'Mail accounts', 'bolt'],
    ['/dashboard/deliverability', 'Deliverability', 'shield'],
    ['/dashboard/send-policy', 'Send policy', 'clock']
  ] },
  { key: 'insights', label: 'Insights', icon: 'chart', items: [
    ['/dashboard/analytics', 'Analytics', 'chart'],
    ['/dashboard/ops', 'Operations', 'chart']
  ] },
  { key: 'workspace', label: 'Workspace', icon: 'settings', items: [
    ['/dashboard/team', 'Team', 'users'],
    ['/dashboard/billing', 'Billing', 'card'],
    ['/dashboard/security', 'Security', 'shield'],
    ['/dashboard/admin', 'System', 'settings'],
    ['/dashboard/settings', 'Settings', 'settings']
  ] }
];

const allItems = NAV.flatMap(g => g.items);

function Inner({ children }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState({});
  const [menu, setMenu] = useState(false);
  const [me, setMe] = useState(null);
  const [owner, setOwner] = useState(false);
  const [verify, setVerify] = useState(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('emavanta_sidebar_collapsed') === '1');
      const saved = JSON.parse(localStorage.getItem('emavanta_nav_open') || '{}');
      setOpen(saved);
    } catch { /* first visit */ }
    getStrict('/auth/me').then(r => setMe(r)).catch(e => { if (e.status === 401) router.replace('/signin'); });
    get('/admin/access').then(r => setOwner(!!r.owner)).catch(() => {});
    get('/auth/verify/status').then(r => setVerify(r)).catch(() => {});
  }, []);

  const toggle = () => setCollapsed(c => {
    try { localStorage.setItem('emavanta_sidebar_collapsed', c ? '0' : '1'); } catch { /* ignore */ }
    return !c;
  });
  const toggleGroup = key => setOpen(o => {
    const next = { ...o, [key]: !isOpen(key) };
    try { localStorage.setItem('emavanta_nav_open', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  // a group is open unless the user closed it
  const isOpen = key => open[key] !== false;

  useEffect(() => {
    if (query.length > 1) get(`/search?q=${encodeURIComponent(query)}`).then(r => setResults(Array.isArray(r) ? r : r.items || []));
    else setResults(null);
    setMobileOpen(false);
    setMenu(false);
  }, [query, path]);

  useEffect(() => {
    get('/notifications').then(r => setNotes(Array.isArray(r) ? r : r.items || []));
  }, [path]);

  useEffect(() => {
    const onClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const signOut = async (everywhere = false) => {
    try { await post(everywhere ? '/auth/logout-all' : '/auth/logout', {}); } catch { /* the token is cleared either way */ }
    try { localStorage.removeItem('emavanta_token'); } catch { /* ignore */ }
    router.push('/signin');
  };

  const resendVerification = async () => {
    setVerifyBusy(true);
    try {
      const r = await post('/auth/verify/send', {});
      setVerify(v => ({ ...v, ...r, sent: true }));
    } catch { /* the banner keeps its own state */ }
    finally { setVerifyBusy(false); }
  };

  // Breadcrumb label: the deepest nav item that matches, so /dashboard/campaigns/new still
  // reads "Campaigns" instead of falling back to the generic word.
  const label = allItems
    .filter(([href]) => isActivePath(href, path))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] || 'Workspace';
  const needsVerification = verify && verify.emailVerified === false;
  const initials = (me?.user?.name || me?.user?.email || 'EM').slice(0, 2).toUpperCase();

  return <div className={`shell ${collapsed ? 'side-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand brand-row">
        <span className="logo-mark"><img src="/emavanta-mark.webp" alt="" /></span>
        {!collapsed && <img className="brand-wordmark" src="/emavanta-logo.webp" alt="Emavanta" />}
      </div>
      <button className="side-toggle" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand' : 'Collapse'}>
        <Icon name="chevron" size={16} style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }} />
        {!collapsed && <span>Collapse menu</span>}
      </button>

      <nav className="nav">
        {NAV.map(group => {
          const single = group.label === null;
          const hasActive = group.items.some(([href]) => isActivePath(href, path));
          const show = single || collapsed || isOpen(group.key);
          return <div key={group.key} className={`nav-group ${hasActive ? 'has-active' : ''}`}>
            {!single && !collapsed && <button className="nav-group-head" onClick={() => toggleGroup(group.key)}
              aria-expanded={isOpen(group.key)} title={group.label}>
              <Icon name={group.icon} size={15} />
              <span>{group.label}</span>
              <Icon name="chevron" size={13} className={`nav-caret ${show ? 'open' : ''}`} />
            </button>}
            {show && group.items.filter(([href]) => href !== '/dashboard/admin' || owner).map(([href, text, icon]) => <Link key={href} href={href} title={text}
              aria-current={isActivePath(href, path) ? 'page' : undefined}
              className={isActivePath(href, path) ? 'active' : ''}>
              <Icon name={icon} size={18} />{!collapsed && <span>{text}</span>}
            </Link>)}
          </div>;
        })}
      </nav>

      {!collapsed && <div className="side-foot">
        <span className="status-dot" /> User-owned sending
      </div>}
    </aside>

    <main className="main">
      <div className="topbar">
        <div className="row">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu"><Icon name="contacts" size={18} /></button>
          <div className="topbar-search">
            <Icon name="search" size={16} />
            <input className="topbar-input" placeholder="Search campaigns, contacts, templates…" value={query}
              onChange={e => setQuery(e.target.value)} />
          </div>
          {results && <div className="card search-pop">
            {results.length ? results.map((r, i) => <Link key={i} href={r.href || '/dashboard'} onClick={() => setQuery('')}>
              <b>{r.title}</b><div className="muted">{r.type}</div>
            </Link>) : <div className="empty">No results</div>}
          </div>}
        </div>
        <div className="row">
          <ConnectionStatus compact />
          <span className="crumb muted">{label}</span>
          <button className="icon-btn" title="Notifications"><Icon name="bell" size={18} />
            {notes.length > 0 && <span className="notif-dot" />}</button>
          <div className="user-menu" ref={menuRef}>
            <button className="avatar avatar-btn" onClick={() => setMenu(v => !v)} aria-haspopup="menu" aria-expanded={menu}
              title={me?.user?.email || 'Account'}>{initials}</button>
            {menu && <div className="user-pop" role="menu">
              <div className="user-pop-head">
                <b>{me?.user?.name || 'Signed in'}</b>
                <span className="muted">{me?.user?.email || ''}</span>
                {me?.organization?.name && <span className="badge">{me.organization.name}</span>}
              </div>
              {needsVerification && <button className="user-pop-item warn" onClick={() => { setMenu(false); resendVerification(); }}>
                <Icon name="mail" size={15} /> Verify email</button>}
              <Link className="user-pop-item" href="/dashboard/security" onClick={() => setMenu(false)}>
                <Icon name="shield" size={15} /> Security &amp; sessions</Link>
              <Link className="user-pop-item" href="/dashboard/settings" onClick={() => setMenu(false)}>
                <Icon name="settings" size={15} /> Settings</Link>
              <div className="user-pop-sep" />
              <button className="user-pop-item" onClick={() => signOut(false)}>
                <Icon name="logout" size={15} /> Log out</button>
              <button className="user-pop-item danger" onClick={() => signOut(true)}>
                <Icon name="logout" size={15} /> Log out everywhere</button>
            </div>}
          </div>
        </div>
      </div>

      {needsVerification && <div className="verify-banner">
        <Icon name="mail" size={15} />
        <span><b>Confirm your email</b> — {verify.email || 'your address'} is not verified yet, so password recovery is unavailable.</span>
        {verify.link
          ? <Link className="btn sm" href={verify.link}>Open the link</Link>
          : <button className="btn sm" onClick={resendVerification} disabled={verifyBusy}>
            {verifyBusy ? 'Sending…' : verify.sent ? 'Sent — check your inbox' : 'Send the link'}</button>}
      </div>}

      <ConnectionStatus />
      {children}
    </main>
  </div>;
}

export default function DashboardShell({ children }) {
  return <ToastProvider><Inner>{children}</Inner></ToastProvider>;
}

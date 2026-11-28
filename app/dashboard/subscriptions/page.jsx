'use client';

import { useEffect, useState } from 'react';
import { get } from '../../../lib/api';
import PlanCards from '../../../components/PlanCards';
import CheckoutPanel from '../../../components/CheckoutPanel';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';

const fmt = n => Number(n) < 0 ? 'Unlimited' : Number(n || 0).toLocaleString();

const dateLabel = value => {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString(undefined, { year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' });
};

const SOURCE_LABEL = {
  free: 'Free workspace',
  stripe: 'Card prepaid term',
  crypto: 'USDT prepaid term',
  platform_manual_override: 'Manually assigned term',
  crypto_expired: 'USDT term ended',
  stripe_expired: 'Card term ended',
  platform_manual_override_expired: 'Manual term ended',
  unknown: 'Plan term'
};

/** Dedicated subscriptions view: the full picture of the plan, its term,
 *  cycle usage and one-time credit packs — Billing keeps invoices/payment
 *  methods, this page is about WHAT you are subscribed to. */
export default function Subscriptions() {
  const [sub, setSub] = useState(null);
  const [usage, setUsage] = useState(null);
  const [packs, setPacks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [intent, setIntent] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    Promise.allSettled([
      get('/billing/subscription').then(r => { if (r && !Array.isArray(r)) setSub(r); }),
      get('/billing/usage').then(r => { if (r && !Array.isArray(r)) setUsage(r); }),
      get('/billing/plans').then(r => {
        setPacks(Object.values(r?.addons || {}).filter(a => a.dimension === 'verification_credits'));
      }),
      get('/billing/invoices').then(r => setInvoices(Array.isArray(r) ? r : []))
    ]).then(() => setLoaded(true));
  };

  useEffect(() => { load(); }, []);

  if (!loaded) return <DashboardSkeleton variant="overview" />;

  const plan = sub?.plan || 'free';
  const limits = sub?.limits || usage?.limits || {};
  const v = usage?.verification || {};
  const isFree = plan === 'free';

  return <>
    <PageHead title="Subscriptions" subtitle="Plan, term, usage and credit packs — everything you are subscribed to"
      actions={<button className="btn ghost sm" onClick={load}><Icon name="refresh" size={14}/> Refresh</button>} />

    {/* ── CURRENT SUBSCRIPTION ── */}
    <section className="billing-plan-summary" aria-label="Current subscription">
      <div className="billing-plan-title">
        <div>
          <span className="billing-kicker">CURRENT SUBSCRIPTION</span>
          <h2>{plan.charAt(0).toUpperCase()+plan.slice(1)} plan</h2>
          <p>{SOURCE_LABEL[sub?.source] || SOURCE_LABEL.unknown}</p>
        </div>
        <span className="billing-status">{isFree ? 'No expiry' : 'Active term'}</span>
      </div>

      <div className="billing-dates">
        <div><span>Started</span><strong>{dateLabel(sub?.startedAt)}</strong></div>
        <div><span>{isFree ? 'Plan end' : 'Term ends'}</span><strong>{isFree ? 'No expiry' : dateLabel(sub?.expiresAt)}</strong></div>
        <div><span>Billing term</span><strong>{sub?.interval === 'annual' ? 'Annual' : sub?.interval === 'monthly' ? 'Monthly' : isFree ? 'Free' : '—'}</strong></div>
        <div><span>Renewal</span><strong>No automatic renewal</strong></div>
      </div>

      <p className="billing-footnote">
        Nothing renews or charges automatically — you approve every term yourself.
        {sub?.lastPaymentAt ? ` Last payment: ${dateLabel(sub.lastPaymentAt)}.` : ''}
      </p>
    </section>

    {/* ── CYCLE USAGE vs ALLOWANCE ── */}
    <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', marginTop:18, alignItems:'start' }}>
      {[
        { label:'Sends this cycle', value: usage?.used?.sends || 0, cap: limits.sends },
        { label:'Contacts', value: usage?.used?.contacts || 0, cap: limits.contacts },
        { label:'Seats in use', value: usage?.used?.seats || 0, cap: limits.seats },
        { label:'Verification credits', value: v.packBalance || 0, cap: null,
          sub:'one-time packs only · never expires · plans include none' }
      ].map(row => <div className="card" key={row.label}>
        <div className="stat-label">{row.label}</div>
        <div style={{ fontSize:22, fontWeight:700 }}>
          {fmt(row.value)}{row.cap !== null && <span className="muted" style={{ fontSize:13, fontWeight:500 }}> / {fmt(row.cap)}</span>}
        </div>
        {row.sub && <div className="muted" style={{ fontSize:11.5, marginTop:4 }}>{row.sub}</div>}
        {row.cap !== null && <div className="progress ok" style={{ height:8, marginTop:10 }}>
          <i style={{ width: `${row.cap > 0 ? Math.min(100, Math.round((Number(row.value)/Number(row.cap))*100)) : 0}%` }}/>
        </div>}
      </div>)}
    </div>

    {/* ── VERIFICATION CREDIT PACKS ── */}
    {packs.length > 0 && <div className="card" style={{ marginTop:18 }}>
      <div className="mini-row">
        <div>
          <h2 style={{ margin:0 }}>Verification credit packs</h2>
          <p className="muted" style={{ margin:'4px 0 0', fontSize:12 }}>
            The only way to get verification credits — no plan includes any.
            One-time, never expire, and refunded automatically for “unknown” results.
          </p>
        </div>
        <span className="badge">{Number(v.packBalance||0).toLocaleString()} in balance</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', marginTop:14 }}>
        {packs.map(p => <div key={p.code} style={{ border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
          <div className="stat-label">{fmt(p.amount)} credits</div>
          <div style={{ fontSize:22, fontWeight:700 }}>${p.price}</div>
          <div className="muted" style={{ fontSize:11.5, margin:'2px 0 10px' }}>
            ${(p.price/(p.amount/1000)).toFixed(2)} per 1,000 · one-time
          </div>
          <button className="btn secondary sm" onClick={() => setIntent({ kind:'addon', code:p.code, quantity:1 })}>Buy pack</button>
        </div>)}
      </div>
    </div>}

    {/* ── PLAN SWITCHER ── */}
    <div id="plans" style={{ marginTop:18 }}>
      <div className="mini-row" style={{ marginBottom:10, padding:'0 2px' }}>
        <div>
          <h2 style={{ margin:0, fontSize:17 }}>Plans & limits</h2>
          <span className="muted" style={{ fontSize:12 }}>Switch or raise a limit — proration applies on upgrades, downgrades at period end</span>
        </div>
      </div>
      <PlanCards onChanged={load} />
    </div>

    {/* ── RECENT INVOICES ── */}
    <div className="card" style={{ marginTop:18 }}>
      <div className="mini-row">
        <h2 style={{ margin:0 }}>Recent invoices</h2>
        <a className="muted" href="/dashboard/billing" style={{ fontSize:12 }}>Billing & payment methods →</a>
      </div>
      {invoices.slice(0, 5).map(inv => <div className="block" key={inv._id}>
        <div className="mini-row">
          <b>{inv.number}</b>
          <span>${inv.amount} {inv.currency?.toUpperCase?.() || 'USD'}</span>
        </div>
        <div className="muted" style={{ fontSize:12 }}>{inv.date} · {inv.status}{inv.method ? ` · ${inv.method}` : ''}</div>
      </div>)}
      {!invoices.length && <p className="muted" style={{ fontSize:13 }}>
        No invoices yet — payments appear here the moment you approve a term or pack.
      </p>}
    </div>

    <CheckoutPanel intent={intent} onClose={() => setIntent(null)} onPaid={load} onSubmitted={load} />
  </>;
}

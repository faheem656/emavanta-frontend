'use client';
import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { useToast } from './ToastProvider';
import Icon from './Icon';
import CheckoutPanel from './CheckoutPanel';
import { FALLBACK_PAYLOAD, fmtLimit } from '../lib/plans';

/** One plain sentence per add-on, so the grid reads like a shop and not a schema. */
const BENEFIT = {
  mailboxes: 'More sending mailboxes to rotate through',
  contacts: 'More people you can store and target',
  sends: 'More emails you can send each month',
  seats: 'More teammates with their own login',
  client_workspaces: 'More separate workspaces to run for clients',
  ai_credits: 'More credits for the writing assistant',
  verification_credits: 'More addresses you can verify',
  tracking_events: 'More opens and clicks you can record',
  storage_gb: 'More room for attachments and exports',
  api_tier: 'Unlocks the higher API request tier',
  support: 'Priority support with a faster first reply',
  api: 'Unlocks the higher API request tier',
  support_tier: 'Priority support with a faster first reply'
};
const describe = a => BENEFIT[a.dimension] || BENEFIT[a.code] || 'Extra capacity on top of your plan';

export default function PlanCards({ compact = false, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(FALLBACK_PAYLOAD);
  const [sub, setSub] = useState({ plan: 'free' });
  const [cycle, setCycle] = useState('monthly');
  const [intent, setIntent] = useState(null);

  const refresh = () => {
    get('/billing/plans').then(r => { if (r?.plans?.length) setData(r); }).catch(() => {});
    get('/billing/subscription').then(r => { if (r && !Array.isArray(r)) setSub(r); }).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const current = sub?.plan || 'free';
  // Nothing changes until the checkout dialog is paid. Free is a cancellation,
  // so it is still confirmed (that is what stops an accidental downgrade).
  const choose = p => {
    if (p.code === current) return;
    setIntent({ kind: 'plan', plan: p.code, interval: cycle, amount: cycle === 'annual' ? (p.yearly || p.monthly * 10) : p.monthly,
      label: `${p.name} plan · ${cycle === 'annual' ? 'yearly' : 'monthly'}` });
  };
  const paid = async r => {
    if (r?.limits) setSub(s => ({ ...s, plan: r.plan, addons: r.addons || s.addons, limits: r.limits }));
    refresh();
    onChanged?.(r);
    if (r?.invoice) toast(`${r.invoice.number} paid · ${r.invoice.method}`);
  };

  return <>
    <div className="mini-row" style={{ marginBottom: 14 }}>
      <div>
        <h2 style={{ margin: 0 }}>Plans</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          You are on <b>{data.plans.find(p => p.code === current)?.name || 'Free'}</b>.
          {current === 'free' ? ' Free is the default and stays active until you upgrade.' : ' Prepaid term; no automatic renewal.'}
        </p>
      </div>
      <div className="segmented">
        <button className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
        <button className={cycle === 'annual' ? 'active' : ''} onClick={() => setCycle('annual')}>Annual · 2 months free</button>
      </div>
    </div>

    <div className={`plan-grid ${compact ? 'compact' : ''}`}>
      {data.plans.map(p => {
        const isCurrent = p.code === current;
        const price = cycle === 'annual' ? Math.round((p.yearly || p.monthly * 10) / 12) : p.monthly;
        return <div className={`plan-card ${p.code === 'growth' ? 'featured' : ''} ${isCurrent ? 'current' : ''}`} key={p.code}>
          {isCurrent && <span className="plan-flag">Current plan</span>}
          {p.code === 'growth' && !isCurrent && <span className="plan-flag alt">Most popular</span>}
          <div className="plan-name">{p.name}</div>
          <div className="plan-price">
            <span className="amt">${price}</span><span className="per">/mo</span>
          </div>
          <div className="muted" style={{ fontSize: 12, minHeight: 18 }}>
            {cycle === 'annual' ? `$${p.yearly || p.monthly * 10}/yr · billed annually` : `$${p.yearly || p.monthly * 10}/yr if billed annually`}
          </div>
          <ul className="plan-features">
            <li><Icon name="contacts" size={13} /> {fmtLimit(p.limits.contacts)} contacts</li>
            <li><Icon name="mail" size={13} /> {fmtLimit(p.limits.sends)} sends/mo</li>
            <li><Icon name="users" size={13} /> {p.limits.seats < 0 ? 'Unlimited seats' : `${p.limits.seats} seat${p.limits.seats === 1 ? '' : 's'}`}</li>
            <li><Icon name="bolt" size={13} /> {p.limits.automations < 0 ? 'Unlimited automations' : `${p.limits.automations} automation${p.limits.automations === 1 ? '' : 's'}`}</li>
            <li><Icon name="shield" size={13} /> {['growth','scale','business'].includes(p.code) ? 'No Emavanta footer on campaigns & hosted forms' : 'Emavanta branding on campaigns & hosted forms'}</li>
          </ul>
          {isCurrent
            ? <button className="btn secondary" disabled style={{ width: '100%', opacity: .85 }}>Current plan</button>
            : <button className={`btn ${p.code === 'growth' ? '' : 'secondary'}`} style={{ width: '100%' }}
                onClick={() => choose(p)}>
                {p.monthly === 0 ? 'Switch to Free' : `Upgrade · $${price}/mo`}
              </button>}
        </div>;
      })}
    </div>

    <div className="card luxe-card" style={{ marginTop: 16 }}>
      <div className="mini-row"><div><h3 style={{ margin: 0 }}>Add-ons</h3>
        <p className="muted" style={{ margin: '4px 0 0' }}>Raise one limit without changing your plan.</p></div>
        <Icon name="plus" size={16} /></div>
      <div className="addon-grid">
        {Object.values(data.addons || {}).map(a => <div key={a.code} className="addon-card">
          <b>{a.label || a.code}</b>
          <span className="muted">{describe(a)}</span>
          <div className="mini-row" style={{ marginTop: 6 }}><b>${a.price}/mo</b>
            <button className="btn ghost sm" onClick={() => setIntent({ kind: 'addon', code: a.code, quantity: 1,
              amount: a.price, label: `${a.label || a.code} · $${a.price}/mo` })}>Buy</button></div>
        </div>)}
      </div>
    </div>

    <CheckoutPanel intent={intent} onClose={() => setIntent(null)}
      onPaid={r => { if (r?.free) { setSub(s => ({ ...s, plan: 'free' })); refresh(); onChanged?.(r); } else paid(r); }} />
  </>;
}

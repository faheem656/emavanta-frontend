'use client';
import { useState } from 'react';
import Link from 'next/link';
import { post } from '../../../lib/api';
import FAQ from '../../../components/FAQ';
import { FALLBACK_PAYLOAD, fmtLimit } from '../../../lib/plans';

const included = [
  'Personalization with fallbacks + safe HTML escaping',
  'Human-like cadence, jitter and working hours',
  'Account pools, sticky-by-contact and rotation',
  'Preflight, suppression and one-click unsubscribe',
  'CRM, forms, calendar and workspace handoff',
  'Tenant isolation, RBAC, MFA and audit chain'
];

export default function Pricing(){
  const [data,setData] = useState(FALLBACK_PAYLOAD);
  const [annual,setAnnual] = useState(false);
  const [msg,setMsg] = useState('');

  const price = p => annual ? Math.round(p.yearly / 12) : p.monthly;
  const checkout = async p => {
    try { const r = await post('/billing/checkout',{plan:p.code,interval:annual?'annual':'monthly'});
      setMsg(r.url ? `Checkout ready: ${r.url}` : `Selected ${p.name}. Our billing team will open checkout shortly.`); }
    catch(e){ setMsg(e.message); }
  };

  return <>
    <section className="hero2 container" style={{paddingBottom:18}}>
      <div className="badge ok">Transparent USD pricing · no email resale</div>
      <h1 style={{fontSize:52}}>Pay for the engine,<br/><span className="grad">not someone else's emails.</span></h1>
      <p className="lead">Flat workspace plans with hard caps by default. Connect the accounts you already own, raise any single limit with an add-on, and never get a surprise delivery bill.</p>
      <div className="row" style={{justifyContent:'center',marginTop:22}}>
        <button className={`btn ${annual?'secondary':''}`} onClick={()=>setAnnual(false)}>Monthly</button>
        <button className={`btn ${annual?'secondary':''}`} onClick={()=>setAnnual(true)}>Yearly · 2 months free</button>
      </div>
      <div className="muted" style={{marginTop:12,fontSize:12}}>Standard USD catalogue · plans are identical in the dashboard</div>
    </section>

    <section className="section container" style={{paddingTop:18}}>
      <div className="cards3 plan-grid">
        {data.plans.map(p=><div className={`priceCard ${p.code==='growth'?'popular':''}`} key={p.code}>
          {p.code==='growth' && <div className="plan-badge">Most popular</div>}
          <div className="stat-label">{p.name}</div>
          <div className="price">${price(p)}<small>/mo</small></div>
          <p className="muted" style={{fontSize:12}}>{annual?`$${p.yearly} billed once a year`:'billed monthly · cancel anytime'}</p>
          <ul className="feat compact">
            <li><b>{fmtLimit(p.limits.sends)}</b> sends / month</li>
            <li><b>{fmtLimit(p.limits.contacts)}</b> contacts</li>
            <li><b>{fmtLimit(p.limits.seats)}</b> seats · <b>{p.limits.mailboxes}</b> connected accounts</li>
            <li><b>{p.limits.client_workspaces}</b> client workspaces</li>
            <li><b>{fmtLimit(p.limits.campaigns)}</b> campaigns · <b>{fmtLimit(p.limits.sequences)}</b> sequences</li>
            <li>{['growth','scale','business'].includes(p.code) ? <b>No Emavanta footer on campaign emails & hosted forms</b> : 'Emavanta footer on campaign emails & hosted forms'}</li>
          </ul>
          <button className={`btn ${p.code==='growth'?'':'secondary'}`} style={{marginTop:'auto'}} onClick={()=>checkout(p)}>
            {p.code==='free'?'Start free':'Choose '+p.name}
          </button>
        </div>)}
      </div>
      <p className="muted" style={{fontSize:12,marginTop:18}}>Footer-free means no Emavanta attribution in customer-facing campaign emails or hosted forms. Hosted form URLs and tracking links can still use the platform domain; account and security emails remain Emavanta-branded.</p>
      {msg && <p className="notice" style={{marginTop:16}}>{msg}</p>}
      <div className="strip" style={{marginTop:26}}>
        {included.map(x=><span className="chip" key={x}>✓ {x}</span>)}
      </div>
    </section>

    <section className="section container">
      <div className="stats-band">
        <div><div className="stat">14</div><div className="muted">day trial, no card</div></div>
        <div><div className="stat">10×</div><div className="muted">annual = 10 months</div></div>
        <div><div className="stat">0</div><div className="muted">mailboxes sold by us</div></div>
        <div><div className="stat">100%</div><div className="muted">USD, predictable</div></div>
      </div>
    </section>

    <section className="section container">
      <h2 className="section-title">Add-ons — raise one limit, not the whole plan</h2>
      <p className="section-sub">Need 5 more mailboxes or 25k more sends? Buy only that pack. Nothing is auto-charged unless you explicitly enable it and set your own cap.</p>
      <div className="cards3 addon-grid">
        {Object.values(data.addons||{}).map(a=><div className="card2 addon" key={a.code}>
          <div className="mini-head">
            <h3>{a.code.replace(/([0-9]+)/,' $1').replace(/_/g,' ')}</h3>
            <span className="addon-price">${a.price}</span>
          </div>
          <p>+{fmtLimit(a.amount)} {a.dimension.replace(/_/g,' ')} / month</p>
        </div>)}
      </div>
    </section>

    <section className="section container">
      <h2 className="section-title">How we compare</h2>
      <div className="compare-wrap"><table className="compare">
        <thead><tr><th></th><th>Emavanta</th><th>Per-seat sales tools</th><th>ESP bundles</th></tr></thead>
        <tbody>
          <tr><td>Who owns the mailbox</td><td>You</td><td>Usually you</td><td>The provider</td></tr>
          <tr><td>Pricing shape</td><td>Flat workspace + packs</td><td>Per user / month</td><td>Per send + credits</td></tr>
          <tr><td>Human-like outreach cadence</td><td>Built in</td><td>Limited</td><td>Not the focus</td></tr>
          <tr><td>Team of 10 monthly cost</td><td><b>$49</b> on Growth</td><td>~$490–790</td><td>Usage-based</td></tr>
          <tr><td>You can bring your own provider</td><td>Yes</td><td>Sometimes</td><td>No</td></tr>
        </tbody>
      </table></div>
    </section>

    <section className="section container">
      <h2 className="section-title">Pricing questions</h2>
      <FAQ items={[
        ['What is a "send"?','An email submitted through the platform using your own connected account. We do not provide the mailbox or the delivery itself.'],
        ['What happens at 100%?','Jobs pause. No automatic charge unless you explicitly enable auto-add packs and set a monthly cap.'],
        ['Do mailbox slots include a mailbox?','No. They allow you to connect that many of your own Google/Microsoft/SMTP/ESP accounts. You pay your provider directly.'],
        ['Can I change plans mid-cycle?','Upgrades apply immediately with proration; downgrades take effect at the end of the period. Your data stays available and becomes read-only before archival.'],
        ['Do you provide an email API or mailboxes?','No. We do not provide email-sending APIs, IPs or mailbox supply. You connect your own provider; our internal service only powers the dashboard.'],
        ['Do you offer GDPR compliance?','No compliance certification is marketed. The customer is the sender/controller and is responsible for their messages. We provide privacy and hygiene tooling, and a lawyer-reviewed Terms/DPA.']
      ]}/>
      <div className="footer-cta">
        <div><h3>Start with 500 free sends</h3><p className="muted">No card. Keep your data if you downgrade.</p></div>
        <Link className="btn btn-lg" href="/signup">Create workspace</Link>
      </div>
    </section>
  </>;
}

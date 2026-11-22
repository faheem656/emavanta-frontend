'use client';
import { useEffect, useState } from 'react';
import { get, post } from '../../../lib/api';
import PlanCards from '../../../components/PlanCards';
import CheckoutPanel from '../../../components/CheckoutPanel';
import PaymentMethods from '../../../components/PaymentMethods';
import PageHead from '../../../components/PageHead';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';

const dateLabel = v => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleString(undefined,{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}) : 'Not available';
const fmt = n => (Number(n) < 0 ? 'Unlimited' : Number(n || 0).toLocaleString());

export default function Billing(){
 const toast = useToast();
 const [usage,setUsage]=useState(null),[alerts,setAlerts]=useState(null),[invoices,setInvoices]=useState([]);
 const [sub,setSub]=useState(null),[cryptoHistory,setCryptoHistory]=useState([]);
 const [addonLabels,setAddonLabels]=useState({}),[cancelBusy,setCancelBusy]=useState(''),[cancelError,setCancelError]=useState('');
 const [showAllInvoices,setShowAllInvoices]=useState(false);
 const [intent,setIntent]=useState(null);
 const load=()=>{
  get('/billing/usage').then(setUsage).catch(()=>{});
  get('/billing/alerts').then(setAlerts).catch(()=>{});
  get('/billing/crypto/history').then(r=>setCryptoHistory(Array.isArray(r)?r:[])).catch(()=>{});
  get('/billing/invoices').then(r=>setInvoices(Array.isArray(r)?r:[])).catch(()=>{});
  get('/billing/subscription').then(r=>{ if(r && !Array.isArray(r)) setSub(r); }).catch(()=>{});
  get('/billing/plans').then(r=>{
    const map = {};
    for (const [code, a] of Object.entries(r?.addons || {})) map[code] = a.label || code;
    setAddonLabels(map);
  }).catch(()=>{});
 };
 // Deep links: ?addon=seats5 (seat upsell), ?plan=growth (upgrade), ?checkout=success
 useEffect(()=>{
  load();
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const addon = q?.get('addon'); const plan = q?.get('plan');
  if(addon==='seats5') setIntent({ kind:'addon', code:'seats5', quantity:1, amount:15, label:'+5 team seats · $15/mo' });
  else if(addon) setIntent({ kind:'addon', code:addon, quantity:1 });
  else if(plan) setIntent({ kind:'plan', plan, interval:q.get('interval')||'monthly' });
  // Old bookmarked URLs (`/billing?mock_checkout=launch`) used to 404 on a stale
  // backend. Now they land here and open the real, payment-first checkout.
  const legacy = q?.get('mock_checkout') || q?.get('checkout_plan');
  if(legacy) setIntent({ kind:'plan', plan:legacy, interval:q.get('interval')||'monthly' });
  else if(q?.get('checkout')==='1') document.getElementById('plans')?.scrollIntoView({ behavior:'smooth' });
 },[]);
 async function requestCancel(p){
  if(!p.orderId||cancelBusy)return;
  if(!window.confirm('Request cancellation? This does not reverse or refund a transfer. The owner must investigate before the order is closed.'))return;
  setCancelBusy(p.orderId);setCancelError('');
  try{await post(`/billing/crypto/${encodeURIComponent(p.orderId)}/request-cancellation`,{});toast('Cancellation requested. Do not send another payment.');load();}catch(e){setCancelError(e.message);}finally{setCancelBusy('');}
 }
 const pct=alerts?.pct||0;
 const limits = sub?.limits || {};
 const seats = limits.seats;
 return <>
  <PageHead title="Billing" subtitle="USD plans, usage and add-ons"
   actions={<button className="btn ghost sm" onClick={load}><Icon name="refresh" size={14}/> Refresh</button>}/>

  <section className="billing-plan-summary" aria-label="Current plan details">
   <div className="billing-plan-title"><div><span className="billing-kicker">YOUR SUBSCRIPTION</span><h2>{sub ? `${(sub.plan||'free').charAt(0).toUpperCase()+(sub.plan||'free').slice(1)} plan` : 'Loading plan…'}</h2><p>{sub?.source==='platform_manual_override' ? 'Manually assigned plan' : sub?.plan==='free' ? 'Free workspace plan' : sub?.source==='crypto' ? 'USDT prepaid term' : sub?.source==='stripe' ? 'Card prepaid term' : 'Plan term'}</p></div><span className="billing-status">{sub ? 'Current plan' : 'Loading'}</span></div>
   <div className="billing-dates"><div><span>Started</span><strong>{dateLabel(sub?.startedAt)}</strong></div><div><span>{sub?.plan==='free'?'Plan end':'Term ends'}</span><strong>{sub?.plan==='free'?'No expiry':dateLabel(sub?.expiresAt)}</strong></div><div><span>Billing term</span><strong>{sub?.interval==='year'?'Annual':sub?.interval==='month'?'Monthly':sub?.plan==='free'?'Free':'Not available'}</strong></div><div><span>Renewal</span><strong>No automatic renewal</strong></div></div>
   {sub?.previousTermEnd && <p className="billing-footnote">Previous paid term ended {dateLabel(sub.previousTermEnd)}. Your workspace is now on Free.</p>}
   {sub?.source==='platform_manual_override' && <p className="billing-footnote">Manually assigned term · no payment was recorded here and no automatic renewal is scheduled.{!sub?.expiresAt && ' This older manual plan has no recorded end date; ask the owner to set a term.'}</p>}
   {sub?.plan!=='free' && !sub?.expiresAt && sub?.source!=='platform_manual_override' && <p className="billing-footnote">The end date was not recorded for this older plan. Contact support for confirmation.</p>}
  </section>

  <div className="grid" style={{gridTemplateColumns:'1fr 1fr',alignItems:'start'}}>
   <div className="card"><h2>Current usage</h2>
    <div className="mini-row"><b style={{textTransform:'capitalize'}}>{alerts?.level||'ok'}</b><span className="muted">{pct}% of send capacity</span></div>
    <div className="progress ok" style={{height:12,marginTop:10}}><i style={{width:`${Math.min(100,pct)}%`}}/></div>
    <div className="grid" style={{marginTop:16}}>
     {['sends','contacts','seats'].map(k=><div key={k}>
       <div className="stat-label">{k}</div>
       <div style={{fontSize:20,fontWeight:700}}>{usage?.used?.[k]||0}<span className="muted" style={{fontSize:12,fontWeight:500}}> / {fmt(limits[k])}</span></div>
     </div>)}
    </div>
    <p className="muted" style={{marginTop:12,fontSize:12}}>Plan <b style={{textTransform:'capitalize'}}>{sub?.plan||'free'}</b>
      {Object.keys(sub?.addons||{}).length ? ` · ${Object.entries(sub.addons).map(([k,v])=>`${addonLabels[k] || k}${v>1?` ×${v}`:''}`).join(', ')}` : ''}
      {seats!==undefined ? ` · ${seats < 0 ? 'unlimited' : seats} seats` : ''}</p>
   </div>

   <div className="card"><div className="mini-row"><h2 style={{margin:0}}>Invoices</h2>
     {invoices.length>5 && <button className="btn ghost sm" onClick={()=>setShowAllInvoices(v=>!v)}>
       {showAllInvoices?'Show latest 5':`Show all ${invoices.length}`}</button>}</div>
    {(showAllInvoices?invoices:invoices.slice(0,5)).map(i=><div className="block" key={i._id}>
      <div className="mini-row"><b>{i.number}</b><span>${i.amount} {i.currency?.toUpperCase?.()||'USD'}</span></div>
      <div className="muted" style={{fontSize:12}}>{i.date} · {i.status}{i.method?` · ${i.method}`:''}</div>
    </div>)}
    {!invoices.length&&<p className="muted">Invoices appear here after a payment. Nothing is charged automatically.</p>}
   </div>
  </div>

  <div className="card" style={{marginTop:18}}><h2>USDT payment status</h2><p className="muted">Each USDT term is a one-time payment. The customer approves a new transfer for another term; it is not an automatic recurring charge. Owner review can take longer than expected. A submitted transfer cannot be reversed here.</p>{cancelError&&<p className="notice warn" role="alert">{cancelError}</p>}{cryptoHistory.length ? cryptoHistory.map(p=><div className="block" key={p.txHash}><b>{p.kind==='addon'?`${p.code} × ${p.quantity}`:p.plan} · {p.amount} USDT · {p.status}</b><div style={{overflowWrap:'anywhere'}}>{p.txHash}</div>{p.expiresAt&&<div>Term expires {new Date(p.expiresAt).toLocaleString()}</div>}{p.cancelRequestedAt?<p>Cancellation requested; awaiting owner review.</p>:p.status==='pending'&&<button className="btn secondary sm" disabled={!!cancelBusy} onClick={()=>requestCancel(p)}>Request cancellation</button>}</div>):<p>No submitted USDT payments.</p>}</div>

  {sub?.stripeEnabled === true && <div style={{marginTop:18}}><PaymentMethods onChanged={load}/></div>}

  <div id="plans" style={{marginTop:18}}><PlanCards onChanged={load}/></div>

  <CheckoutPanel intent={intent} onClose={()=>setIntent(null)} onPaid={()=>load()} onSubmitted={()=>load()}/>
 </>;
}

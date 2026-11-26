'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const band = b => b === 'healthy' ? 'ok' : b === 'at_risk' ? 'warn' : b === 'critical' ? 'danger' : '';
const RAMP = [50, 100, 200, 350, 500, 750, 1000];

export default function Deliverability(){
 const toast = useToast();
 const [reputation,setReputation] = useState(null);
 const [streams,setStreams] = useState(null);
 const [plan,setPlan] = useState([]);
 const [accounts,setAccounts] = useState([]);
 const [domain,setDomain] = useState('');
 const [advice,setAdvice] = useState(null);
 const [seed,setSeed] = useState(null);
 const [busy,setBusy] = useState('');

 const [loaded,setLoaded] = useState(false);
 useEffect(() => {
  Promise.allSettled([
   get('/deliverability/reputation').then(r => setReputation(r && !Array.isArray(r) ? r : null)),
   get('/deliverability/streams').then(r => setStreams(r?.streams || null)),
   get('/deliverability/warmup-plan?days=7').then(r => setPlan(Array.isArray(r) ? r : (r?.plan || []))),
   get('/accounts').then(r => setAccounts(Array.isArray(r) ? r : []))
  ]).then(() => setLoaded(true));
 }, []);

 const checkDns = async () => {
  setBusy('dns');
  try { setAdvice(await post('/deliverability/dns/advice',{ domain })); }
  catch(e){ notify(toast, e); } finally { setBusy(''); }
 };
 const runSeed = async () => {
  setBusy('seed');
  try { setSeed(await post('/deliverability/seed-tests',{ seedList:['gmail.com','outlook.com','yahoo.com'] })); toast('Seed test queued'); }
  catch(e){ notify(toast, e); } finally { setBusy(''); }
 };

 const score = reputation?.aggregate?.score ?? null;
 const ring = score === null ? 0 : Math.max(4, Math.min(100, score));
 if (!loaded) return <DashboardSkeleton variant="overview" />;
 return <>
  <PageHead title="Deliverability" subtitle="Guard your domain reputation — advice only, your mailbox stays yours"
   actions={<button className="btn sm" onClick={runSeed} disabled={busy==='seed'}><Icon name="bolt" size={15}/> {busy==='seed'?'Queuing…':'Run seed test'}</button>}/>

  <div className="grid" style={{ gridTemplateColumns:'1fr 1fr 1fr', alignItems:'stretch' }}>
   <div className="card luxe-card score-card">
    <div className="stat-label">Overall health</div>
    <div className="score-ring" style={{ ['--pct']:ring }}>
      <div className="score-inner"><b>{score ?? '—'}</b><span>/100</span></div>
    </div>
    <span className={`badge ${band(reputation?.aggregate?.band)}`}>{reputation?.aggregate?.band || 'waiting for data'}</span>
    <p className="muted" style={{ fontSize:12 }}>Blended from bounces, complaints, authentication and pacing across your mailboxes.</p>
   </div>

   <div className="card luxe-card">
    <div className="stat-label">Mail streams</div>
    <div className="stream-list">
     {Object.entries(streams || { outreach:'outreach', marketing:'marketing', transactional:'transactional' }).map(([k,v]) =>
      <div className="stream-row" key={k}><span className={`stream-dot ${k}`}/><b style={{ textTransform:'capitalize' }}>{k}</b>
       <span className="muted">{typeof v === 'string' ? 'separate identity' : v?.note || 'keep isolated'}</span></div>)}
    </div>
    <p className="muted" style={{ fontSize:12 }}>Transactional, marketing and cold outreach should never share a domain.</p>
   </div>

   <div className="card luxe-card">
    <div className="stat-label">Seed test</div>
    <div className="stat" style={{ fontSize:26 }}>{seed?.status || 'Not run'}</div>
    <p className="muted" style={{ fontSize:12 }}>{seed?.scores?.grade ? `Inbox placement grade ${seed.scores.grade}` : 'Sends to Gmail, Outlook and Yahoo seed boxes and reports where you landed.'}</p>
    {seed && <div className="row" style={{ gap:6, marginTop:6 }}>
     {Object.entries(seed.scores || {}).slice(0,3).map(([k,v]) => <span className="badge" key={k}>{k}: {v}</span>)}
    </div>}
   </div>
  </div>

  <div className="grid" style={{ gridTemplateColumns:'1.25fr .75fr', alignItems:'start', marginTop:16 }}>
   <div className="card luxe-card">
    <div className="mini-row"><div><h2 style={{ margin:0 }}>Domain authentication</h2>
      <p className="muted" style={{ margin:'4px 0 0' }}>SPF, DKIM and DMARC records you add at your DNS host. We never ask for DNS access.</p></div></div>
    <div className="row" style={{ marginTop:12 }}>
     <input style={{ flex:1 }} value={domain} onChange={e=>setDomain(e.target.value)} placeholder="yourdomain.com"/>
     <button className="btn sm" onClick={checkDns} disabled={busy==='dns'}>{busy==='dns'?'Checking…':'Show records'}</button>
    </div>
    {advice && <div style={{ marginTop:14 }}>
     <table><thead><tr><th>Type</th><th>Host</th><th>Value</th><th></th></tr></thead><tbody>
      {advice.records.map((r,i)=><tr key={i}>
       <td><span className="badge">{r.type}</span></td>
       <td style={{ fontFamily:'monospace', fontSize:12 }}>{r.name}</td>
       <td style={{ fontFamily:'monospace', fontSize:12, wordBreak:'break-all' }}>{r.value}</td>
       <td><button className="btn ghost sm" onClick={()=>navigator.clipboard?.writeText(r.value).then(()=>toast('Value copied'))}>Copy</button></td>
      </tr>)}
     </tbody></table>
     <p className="muted" style={{ marginTop:10, fontSize:12 }}>{advice.note}</p>
    </div>}
   </div>

   <div className="card luxe-card">
    <h2>Mailbox reputation</h2>
    {reputation?.accounts?.length ? reputation.accounts.map(a=><div key={a.accountId} className="rep-row">
      <div><b style={{ fontSize:12.5 }}>{a.email || a.accountId}</b>
       <div className="minibar"><i style={{ width:`${Math.min(100, a.score || 0)}%`, background:a.band==='healthy'?'#0f9d6e':a.band==='critical'?'#d64550':'#b98118' }}/></div></div>
      <span className={`badge ${band(a.band)}`}>{a.score}</span>
    </div>) : <div className="empty">Connect a mailbox to see per-account scores. <Link href="/dashboard/accounts">Connect now</Link></div>}
    {!accounts.length && <p className="muted" style={{ fontSize:12 }}>Nothing sends until you connect your own mailbox — we do not supply inboxes, IPs or domains.</p>}
   </div>
  </div>

  <div className="card luxe-card" style={{ marginTop:16 }}>
   <div className="mini-row"><div><h2 style={{ margin:0 }}>Warmup ramp</h2>
     <p className="muted" style={{ margin:'4px 0 0' }}>Start small on a new mailbox and double volume gradually — this is the safest path to full volume.</p></div></div>
   <div className="ramp">
    {(plan.length ? plan : RAMP.map((v,i)=>({ day:i+1, volume:v }))).map(p=><div className="ramp-col" key={p.day||p.volume}>
      <div className="ramp-bar" style={{ height:`${Math.max(8, (p.volume / Math.max(...(plan.map(x=>x.volume).concat(RAMP)))) * 120)}px` }}>
       <span>{p.volume}</span></div>
      <span className="muted">day {p.day}</span>
    </div>)}
   </div>
  </div>
 </>;
}

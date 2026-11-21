'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get, put } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const DEFAULT = { minDelaySec:45, maxDelaySec:90, jitterPct:20, dailyCap:50, activeHours:{ start:9, end:18 } };
const clock = h => `${String(h % 24).padStart(2,'0')}:00`;

export default function SendPolicy(){
 const toast = useToast();
 const [accounts,setAccounts] = useState([]);
 const [account,setAccount] = useState('');
 const [policy,setPolicy] = useState(DEFAULT);
 const [saved,setSaved] = useState(DEFAULT);
 const [live,setLive] = useState(null);
 const [busy,setBusy] = useState('');
 const [raw,setRaw] = useState(null); // plan ceiling + mailbox cap, for the plain-language note

 useEffect(() => {
  get('/accounts').then(r => { const a = arr(r); setAccounts(a); if(a[0]) setAccount(a[0]._id); });
 }, []);
 useEffect(() => {
  if(!account) return;
  get(`/send-policy/${account}`).then(p => {
   if(p && !Array.isArray(p)){ setRaw({ throughput: p.throughput, plan: p.plan, accountDailyCap: p.accountDailyCap }); setPolicy({ ...DEFAULT, ...p, activeHours:{ ...DEFAULT.activeHours, ...(p.activeHours||{}) } });
    setSaved({ ...DEFAULT, ...p, activeHours:{ ...DEFAULT.activeHours, ...(p.activeHours||{}) } }); }
  });
  const t = setInterval(() => get('/analytics/overview').then(setLive).catch(()=>{}), 10000);
  get('/analytics/overview').then(setLive).catch(()=>{});
  return () => clearInterval(t);
 }, [account]);

 const avg = (Number(policy.minDelaySec) + Number(policy.maxDelaySec)) / 2;
 const hours = Math.max(1, Number(policy.activeHours.end) - Number(policy.activeHours.start));
 const perHour = Math.round(3600 / avg);
 const workingCap = perHour * hours;
 const effectiveDay = Math.min(Number(policy.dailyCap) || 0, workingCap);
 const current = accounts.find(a => a._id === account);
 const dirty = JSON.stringify(policy) !== JSON.stringify(saved);

 const save = async () => {
  setBusy('save');
  try { const r = await put(`/send-policy/${account}`, policy); setSaved(policy); toast(`Policy saved · about ${r.estimate?.perDay ?? effectiveDay} emails per day`); }
  catch(e){ notify(toast, e); } finally { setBusy(''); }
 };

 const hourBars = useMemo(() => Array.from({ length:24 }, (_, h) => ({
  h, on: h >= Number(policy.activeHours.start) && h < Number(policy.activeHours.end)
 })), [policy.activeHours]);

 return <>
  <PageHead title="Send policy" subtitle="Human-like pacing for each mailbox — see exactly how many emails leave per hour"
   actions={<><button className="btn ghost sm" onClick={()=>setPolicy(saved)} disabled={!dirty}>Reset</button>
    <button className="btn sm" onClick={save} disabled={busy==='save'||!dirty}>{busy==='save'?'Saving…':dirty?'Save policy':'Saved'}</button></>}/>

  {!accounts.length && <div className="card luxe-card"><div className="empty">
   No mailbox connected yet. <Link href="/dashboard/accounts">Connect your own account</Link> to set pacing.</div></div>}

  {!!accounts.length && <div className="grid" style={{gridTemplateColumns:'1.35fr .65fr',alignItems:'start'}}>
   <div className="card luxe-card">
    <div className="mini-row">
     <div><label style={{margin:0}}>Sending account</label>
      <select value={account} onChange={e=>setAccount(e.target.value)} style={{minWidth:280}}>
       {accounts.map(a=><option key={a._id} value={a._id}>{a.fromEmail}</option>)}</select></div>
     <div style={{textAlign:'right'}}>
      <div className="stat-label">Sending right now</div>
      <b>{live?.stats?.sent ?? 0}</b> <span className="muted">sent · {live?.stats?.queued ?? 0} queued</span>
     </div>
    </div>

    <div className="divider"/>

    <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
     <div>
      <label>Minimum gap · {policy.minDelaySec}s</label>
      <input type="range" min={5} max={300} step={5} value={policy.minDelaySec}
        onChange={e=>setPolicy({...policy,minDelaySec:Math.min(Number(e.target.value), Number(policy.maxDelaySec))})}/>
     </div>
     <div>
      <label>Maximum gap · {policy.maxDelaySec}s</label>
      <input type="range" min={10} max={900} step={5} value={policy.maxDelaySec}
        onChange={e=>setPolicy({...policy,maxDelaySec:Math.max(Number(e.target.value), Number(policy.minDelaySec))})}/>
     </div>
    </div>
    <p className="muted" style={{fontSize:12.5}}>Between two emails we wait a random {policy.minDelaySec}–{policy.maxDelaySec} seconds, so traffic never looks machine-timed.</p>

    <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr',marginTop:12}}>
     <div><label>Jitter %</label><input type="number" min={0} max={40} value={policy.jitterPct}
       onChange={e=>setPolicy({...policy,jitterPct:Number(e.target.value)})}/>
      <span className="muted" style={{fontSize:11}}>random ± on every gap</span></div>
     <div><label>Daily cap</label><input type="number" min={1} max={2000} value={policy.dailyCap}
       onChange={e=>setPolicy({...policy,dailyCap:Number(e.target.value)})}/>
      <span className="muted" style={{fontSize:11}}>hard stop per mailbox</span></div>
     <div><label>Working hours</label>
      <div className="row" style={{gap:6}}>
       <input type="number" min={0} max={23} value={policy.activeHours.start}
         onChange={e=>setPolicy({...policy,activeHours:{...policy.activeHours,start:Number(e.target.value)}})}/>
       <span className="muted">to</span>
       <input type="number" min={1} max={24} value={policy.activeHours.end}
         onChange={e=>setPolicy({...policy,activeHours:{...policy.activeHours,end:Number(e.target.value)}})}/>
      </div>
      <span className="muted" style={{fontSize:11}}>nothing sends outside this window</span></div>
    </div>

    <div className="hour-strip" style={{marginTop:16}}>
     {hourBars.map(b=><div key={b.h} className={`hour-cell ${b.on?'on':''}`} title={`${clock(b.h)} — ${b.on?'sending':'paused'}`}>
      <span>{b.h%3===0?b.h:''}</span></div>)}
    </div>
    <div className="mini-row" style={{marginTop:6}}><span className="muted" style={{fontSize:11}}>{clock(policy.activeHours.start)}</span>
     <span className="muted" style={{fontSize:11}}>{clock(policy.activeHours.end)} · {hours}h window</span></div>

    <div className="throughput">
     <div><span className="stat-label">Estimated throughput</span>
      <div className="tput">≈ {perHour} <small>emails/hour</small></div></div>
     <div><span className="stat-label">Per working day</span>
      <div className="tput">≈ {effectiveDay} <small>{Number(policy.dailyCap) > workingCap ? 'capped by working hours' : 'capped by daily limit'}</small></div></div>
     <div><span className="stat-label">Time for 1,000 emails</span>
      <div className="tput">≈ {Math.ceil(1000 / Math.max(perHour,1))} <small>working hours</small></div></div>
    </div>
    <p className="muted" style={{fontSize:12,marginTop:8}}>
     Example: a {policy.minDelaySec}–{policy.maxDelaySec}s gap means roughly one email every {Math.round(avg)} seconds,
     so {perHour}/hour, and {effectiveDay}/day inside a {hours}-hour window.
    </p>
    {raw?.throughput && <p className="muted" style={{fontSize:12,marginTop:4}}>
     Your plan allows up to <b>{Number(raw.throughput.perHour).toLocaleString()} emails/hour</b> across mailboxes
     ({(raw.plan || 'growth')} plan). The engine never goes past that, and the gaps above keep each mailbox
     below its own {raw.accountDailyCap || 50}-a-day limit.
    </p>}
   </div>

   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="card luxe-card">
     <h2>Live account state</h2>
     <div className="mini-row"><span className="muted">Mailbox</span><b>{current?.fromEmail || '—'}</b></div>
     <div className="mini-row"><span className="muted">Status</span><span className={`badge ${current?.status==='active'?'ok':'warn'}`}>{current?.status || 'inactive'}</span></div>
     <div className="mini-row"><span className="muted">Sent today</span><b>{current?.sentToday ?? 0} / {current?.dailyCap ?? policy.dailyCap}</b></div>
     <div className="progress" style={{marginTop:8}}><i style={{width:`${Math.min(100,((current?.sentToday||0)/Math.max(current?.dailyCap||policy.dailyCap,1))*100)}%`}}/></div>
     <div className="mini-row" style={{marginTop:10}}><span className="muted">Queued now</span><b>{live?.stats?.queued ?? 0}</b></div>
     <div className="mini-row"><span className="muted">Delivery rate</span><b>{live?.stats?.sent ? Math.round(((live.stats.delivered||0)/live.stats.sent)*100) : 0}%</b></div>
     <Link className="btn ghost sm" style={{marginTop:10}} href="/dashboard/accounts">Manage mailboxes</Link>
    </div>
    <div className="card luxe-card">
     <h2>Why this matters</h2>
     <p className="muted" style={{fontSize:12.5}}>Sending too fast from a new mailbox is the fastest way to land in spam. These limits protect your domain reputation — they are not throttles we profit from.</p>
    </div>
   </div>
  </div>}
 </>;
}

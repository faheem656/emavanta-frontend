'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { get, post } from '../../../../lib/api';
import PageHead from '../../../../components/PageHead';
import Modal from '../../../../components/Modal';
import Icon from '../../../../components/Icon';
import { Bars } from '../../../../components/Charts';
import { useToast } from '../../../../components/ToastProvider';
import { notify } from '../../../../lib/notify';

const empty = { campaign: null, summary: {}, percentages: {}, timeline: {}, events: [], problems: [], byAccount: {}, recipients: 0 };
const tone = t => ['bounced','complained'].includes(t) ? 'danger' : ['opened','clicked','replied','delivered'].includes(t) ? 'ok' : t === 'queued' ? 'warn' : '';
const pct = v => `${v ?? 0}%`;

export default function CampaignDetail(){
 const { id } = useParams();
 const toast = useToast();
 const [data,setData] = useState(empty);
 const [busy,setBusy] = useState(false);
 const [testOpen,setTestOpen] = useState(false);
 const [testEmail,setTestEmail] = useState('');
 const [testResult,setTestResult] = useState(null);
 const [preflight,setPreflight] = useState(null);
 const [prog,setProg] = useState(null);

 const load = async () => {
  if (!id) return;
  setBusy(true);
  try { const r = await get(`/campaigns/${encodeURIComponent(id)}/tracking`); if (r && !Array.isArray(r)) setData(r); }
  finally { setBusy(false); }
 };
 useEffect(() => { load(); }, [id]);

 const c = data.campaign || {};
 const s = data.summary || {}, p = data.percentages || {};
 const days = Object.entries(data.timeline || {}).slice(-7).map(([day,v]) => ({ label:day.slice(5), value:v.sent||0, color:'#2563eb' }));
 // Live counters while the audience is copied in chunks (works for very large lists).
 useEffect(() => {
  if (!id) return;
  let alive = true;
  const tick = async () => {
   try { const r = await get(`/campaigns/${encodeURIComponent(id)}/progress`); if (alive) setProg(r); } catch { /* page keeps its last numbers */ }
  };
  tick();
  const t = setInterval(tick, 15000);
  return () => { alive = false; clearInterval(t); };
 }, [id]);
 const launch = async () => { try { const r = await post(`/campaigns/${id}/launch`,{confirm:true}); toast(r.message || `${r.queued||0} recipients queued`); load(); }
  catch(e){ notify(toast, e); } };
 const pause = async () => { try { await post(`/campaigns/${id}/pause`,{}); toast('Campaign paused'); load(); }
  catch(e){ notify(toast, e); } };
 const runPreflight = async () => { try { setPreflight(await post(`/campaigns/${id}/preflight`,{})); }
  catch(e){ notify(toast, e); } };
 const sendTest = async () => { try { const r = await post(`/campaigns/${id}/test-send`,{email:testEmail}); setTestResult(r); toast('Test accepted by the provider; check the inbox'); load(); }
  catch(e){ notify(toast, e); } };

 const cards = [
  ['Queued',s.queued||0,`${p.progress||0}% complete`,'#7c3aed'],
  ['Sent',s.sent||0,'accepted by provider','#2563eb'],
  ['Delivered',s.delivered||0,`${pct(p.delivery)} delivery rate`,'#0f9d6e'],
  ['Opened',s.opened||0,`${pct(p.open)} of delivered`,'#b58a3a'],
  ['Clicked',s.clicked||0,`${pct(p.click)} of opens`,'#1d9d9d'],
  ['Replied',s.replied||0,`${pct(p.reply)} reply rate`,'#0f9d6e'],
  ['Bounced',s.bounced||0,`${pct(p.bounce)} bounce rate`,'#d64550'],
  ['Complained',s.complained||0,`${pct(p.complaint)} complaint rate`,'#d64550'],
  ['Unsubscribed',s.unsubscribed||0,`${pct(p.unsubscribe)} opt-out rate`,'#b7791f']
 ];

 return <>
  <PageHead title={c.name || 'Campaign details'} subtitle={`${c.stream || 'campaign'} · ${c.status || 'loading'} · ${data.recipients||0} recipients`}
   actions={<div className="row"><Link className="btn secondary sm" href="/dashboard/campaigns"><Icon name="chevron" size={14}/> Back</Link>
    <button className="btn ghost sm" onClick={runPreflight}><Icon name="check" size={14}/> Preflight</button>
    <button className="btn secondary sm" onClick={()=>{setTestOpen(true);setTestResult(null);setTestEmail('');}}><Icon name="mail" size={14}/> Send test</button>
    {['draft','paused'].includes(c.status)
      ? <button className="btn sm" onClick={launch}><Icon name="bolt" size={14}/> Launch</button>
      : c.status === 'queued' ? <button className="btn ghost sm" onClick={pause}>Pause</button> : null}
   </div>}/>

  {prog?.intake && prog.intake.status !== 'idle' && <div className={`intake-card ${prog.intake.status}`}>
   <div className="intake-top">
    <div>
     <b>{prog.intake.status === 'running' ? 'Copying your audience…'
       : prog.intake.status === 'cancelled' ? 'Intake stopped'
       : 'Audience ready'}</b>
     <div className="muted" style={{fontSize:11.5}}>
      {Number(prog.intake.done||0).toLocaleString()} of {Number(prog.intake.total||0).toLocaleString()} contacts added
      {prog.intake.status === 'running' ? ` · ${Number(prog.intake.chunkSize||2000).toLocaleString()} per batch, sending starts as batches fill` : ''}
      {prog.intake.status === 'cancelled' ? ' · presses Launch to continue' : ''}
     </div>
    </div>
    <div className="intake-split">
     <span className="badge">{Number(prog.sent||0).toLocaleString()} sent</span>
     <span className="badge warn">{Number(prog.queued||0).toLocaleString()} waiting</span>
     <span className="badge">{Number(prog.doneBatches||0).toLocaleString()}/{Number(prog.batches||0).toLocaleString()} batches</span>
    </div>
   </div>
   <div className="funnel-bar"><i style={{width:`${prog.intake.total ? Math.min(100, Math.round(((prog.intake.done||0)/prog.intake.total)*100)) : 0}%`}}/></div>
  </div>}

  {!!data.reviewNeeded?.length && <div className="notice warn" role="alert"><b>Delivery needs review</b><p>Some sends have an uncertain outcome. Check the sending provider and mailbox history before trying again; an email may already have been accepted. Showing up to 50 recipients.</p><ul>{data.reviewNeeded.map(r=><li key={r.id}>{r.email} · {r.status==='sending'?'send interrupted':'outcome unknown'}</li>)}</ul><button className="btn secondary sm" onClick={load}>Refresh status</button></div>}

  <div className="detail-funnel card luxe-card">
   <div className="mini-row"><h2 style={{margin:0}}>Delivery funnel</h2><span className="badge ok">{c.status||'—'}</span></div>
   <div className="funnel-bar"><i style={{width:`${Math.min(100,p.progress||0)}%`}}/></div>
   <div className="muted" style={{fontSize:11,marginTop:6}}>{p.progress||0}% of audience handed to sending · human cadence always on</div>
  </div>

  {(c.sequenceSteps||[]).length>0 && <div className="card luxe-card" style={{marginTop:14}}>
   <div className="mini-row"><h2 style={{margin:0}}>Sequence</h2><span className="badge">{c.sequenceSteps.length} steps</span></div>
   <div className="flow" style={{marginTop:12}}>
    {c.sequenceSteps.map((st,i)=><div key={i} className="flow-step"><span className="avatar">{i+1}</span>
     <span className="badge">{st.type}</span><span className="muted">
      {st.type==='email'?'Send email':st.type==='delay'?`Wait ${st.days||2} day(s)`:st.condition}
     </span></div>)}
   </div>
  </div>}

  <div className="detail-stats">
   {cards.map(([label,value,note,color])=><div className="card luxe-card funnel-card" key={label}>
    <div className="stat-label">{label}</div><div className="stat" style={{color}}>{value}</div>
    <div className="muted" style={{fontSize:11}}>{note}</div>
   </div>)}
  </div>

  <div className="grid" style={{gridTemplateColumns:'1.25fr .75fr',marginTop:16}}>
   <div className="card luxe-card"><div className="mini-row"><h2>Activity</h2><span className="badge">last 7 days</span></div>
    {days.length?<Bars data={days}/>:<div className="empty">No activity yet.</div>}
   </div>
   <div className="card luxe-card"><h2>Deliverability signals</h2>
    <div className="signal-grid">
     <div><span className="stat-label">Delivery</span><b>{pct(p.delivery)}</b></div>
     <div><span className="stat-label">Open</span><b>{pct(p.open)}</b></div>
     <div><span className="stat-label">Click</span><b>{pct(p.click)}</b></div>
     <div><span className="stat-label">Bounce</span><b style={{color:'var(--danger)'}}>{pct(p.bounce)}</b></div>
     <div><span className="stat-label">Complaint</span><b style={{color:'var(--danger)'}}>{pct(p.complaint)}</b></div>
     <div><span className="stat-label">Reply</span><b style={{color:'var(--ok)'}}>{pct(p.reply)}</b></div>
    </div>
   </div>
  </div>

  {(data.problems||[]).length>0 && <div className="card luxe-card" style={{marginTop:16}}>
   <h2>Needs attention <span className="badge danger">{(data.problems||[]).length}</span></h2>
   <div className="table-card"><table><thead><tr><th>Event</th><th>Recipient</th><th>When</th><th>Detail</th></tr></thead><tbody>
    {data.problems.map(e=><tr key={e._id}><td><span className={`badge ${tone(e.type)}`}>{e.type}</span></td>
     <td>{e.email||'—'}</td><td className="muted">{e.createdAt?.replace('T',' ').slice(0,19)}</td>
     <td className="muted">{e.scope||e.classification||e.provider||'—'}</td></tr>)}
   </tbody></table></div>
  </div>}

  {Object.keys(data.byAccount||{}).length>0 && <div className="card luxe-card" style={{marginTop:16}}>
   <h2>Account performance</h2>
   <div className="table-card"><table><thead><tr><th>Account</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Bounced</th></tr></thead><tbody>
    {Object.entries(data.byAccount).map(([name,v])=><tr key={name}><td><b>{name}</b></td><td>{v.sent||0}</td><td>{v.delivered||0}</td>
     <td>{v.opened||0}</td><td>{v.clicked||0}</td><td>{v.bounced||0}</td></tr>)}
   </tbody></table></div>
  </div>}

  <div className="card luxe-card" style={{marginTop:16}}>
   <div className="mini-row"><h2 style={{margin:0}}>Full event stream</h2><button className="btn ghost sm" onClick={load} disabled={busy}><Icon name="refresh" size={14}/> Refresh</button></div>
   <div className="table-card"><table><thead><tr><th>When</th><th>Event</th><th>Recipient</th><th>Message</th><th>Source</th><th>Detail</th></tr></thead><tbody>
    {(data.events||[]).map(e=><tr key={e._id}>
     <td className="muted">{e.createdAt?.replace('T',' ').slice(0,19)||'—'}</td>
     <td><span className={`badge ${tone(e.type)}`}>{e.type}</span></td>
     <td>{e.email||'—'}</td><td><span className="mono">{e.messageId?.slice(0,12)||'—'}</span></td>
     <td className="muted">{e.provider||'—'}</td><td className="muted">{e.url||e.scope||e.note||'—'}</td>
    </tr>)}
    {!(data.events||[]).length&&<tr><td colSpan={6}><div className="empty">No events yet — launch or send a test.</div></td></tr>}
   </tbody></table></div>
  </div>

  {testOpen && <Modal title="Send tracked test" onClose={()=>setTestOpen(false)}
   footer={<><button className="btn secondary" onClick={()=>setTestOpen(false)}>Close</button>
    <button className="btn" disabled={!/^\S+@\S+\.\S+$/.test(testEmail)} onClick={sendTest}><Icon name="send" size={14}/> Send test</button></>}>
   <p className="muted">Uses the campaign template and a connected account.</p>
   <label style={{marginTop:12}}>Recipient</label><input style={{width:'100%'}} type="email" value={testEmail}
    placeholder="you@company.com" onChange={e=>setTestEmail(e.target.value)}/>
   {testResult && <div className="notice ok" style={{marginTop:14}}>Sent to <b>{testResult.to}</b> via {testResult.account}<br/>
    <span className="muted">{testResult.subject}</span></div>}
  </Modal>}

  {preflight && <Modal title="Preflight" onClose={()=>setPreflight(null)}
   footer={<button className="btn secondary" onClick={()=>setPreflight(null)}>Close</button>}>
   <div className={`notice ${preflight.ok?'ok':''}`}>{preflight.ok?'Ready to send.':'Review before sending.'}</div>
   <pre className="code-block">{JSON.stringify(preflight.issues||preflight,null,2)}</pre>
  </Modal>}
 </>;
}

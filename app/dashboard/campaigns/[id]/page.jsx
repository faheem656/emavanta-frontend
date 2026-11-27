'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { get, getStrict, post, patch, del } from '../../../../lib/api';
import PageHead from '../../../../components/PageHead';
import DashboardSkeleton from '../../../../components/DashboardSkeleton';
import Modal from '../../../../components/Modal';
import Icon from '../../../../components/Icon';
import { Bars } from '../../../../components/Charts';
import { useToast } from '../../../../components/ToastProvider';
import { notify } from '../../../../lib/notify';

const empty = { campaign: null, summary: {}, percentages: {}, timeline: {}, events: [], eventsTotal: 0, problems: [], byAccount: {}, recipients: 0, paceActual: null };
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
 const [pace,setPace] = useState(null);
 const [senderAccounts,setSenderAccounts] = useState([]);
 const [senderSel,setSenderSel] = useState([]);
 const [sendersBusy,setSendersBusy] = useState(false);
 // First load only — the skeleton must not reappear on refresh/polling.
 const [loaded,setLoaded] = useState(false);

 const load = async () => {
  if (!id) return;
  setBusy(true);
  try { const r = await get(`/campaigns/${encodeURIComponent(id)}/tracking?eventSkip=0&eventLimit=100`); if (r && !Array.isArray(r)) setData(r); }
  finally { setBusy(false); setLoaded(true); }
 };
 // Event stream paging: fetch one more page and append — a campaign with
 // millions of events never loads (or renders) everything at once.
 const loadMoreEvents = async () => {
  if (!id || busy) return;
  const skip = (data.events || []).length;
  if (data.eventsTotal && skip >= data.eventsTotal) return;
  setBusy(true);
  try {
   const r = await get(`/campaigns/${encodeURIComponent(id)}/tracking?eventSkip=${skip}&eventLimit=100`);
   if (r && !Array.isArray(r)) setData(d => ({ ...d, events: [...(d.events || []), ...(r.events || [])], eventsTotal: r.eventsTotal ?? d.eventsTotal }));
  } finally { setBusy(false); }
 };
 useEffect(() => { load(); }, [id]);

 // Mailbox picker for the mid-run "Sending from" card.
 useEffect(() => { get('/accounts').then(r => setSenderAccounts(Array.isArray(r) ? r : (r?.items || []))).catch(() => {}); }, []);

 // Pace editor mirrors the campaign's live policy; refreshed whenever tracking reloads.
 useEffect(() => {
  const c = data.campaign; if (!c) return;
  const sp = c.sendPolicy || {};
  setPace({
   dailyCap: Number(sp.dailyCap) || 50,
   gapSeconds: Number(c.gapSeconds) || Number(sp.minDelaySec && Math.round((Number(sp.minDelaySec) + Number(sp.maxDelaySec || sp.minDelaySec)) / 2)) || 45,
   timezone: sp.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
   startTime: sp.schedule?.startTime || '09:00',
   endTime: sp.schedule?.endTime || '17:00',
   daysOfWeek: Array.isArray(sp.schedule?.daysOfWeek) && sp.schedule.daysOfWeek.length ? sp.schedule.daysOfWeek : [1,2,3,4,5]
  });
  setSenderSel(c.accountPool || []);
 }, [data.campaign]);


 // Full event stream grouped per lead — every lead starts collapsed so a big
 // campaign shows one tidy row per contact instead of hundreds of event rows.
 const [openLeads, setOpenLeads] = useState(() => new Set());
 const leads = useMemo(() => {
  const map = new Map();
  for (const e of (data.events || [])) {
   const key = e.email || 'unknown recipient';
   if (!map.has(key)) map.set(key, []);
   map.get(key).push(e);
  }
  return [...map.entries()].map(([email, events]) => ({ email, events, latest: events[0] }));
 }, [data.events]);
 const toggleLead = email => setOpenLeads(prev => {
  const next = new Set(prev);
  if (next.has(email)) next.delete(email); else next.add(email);
  return next;
 });
 const allOpen = leads.length > 0 && openLeads.size === leads.length;

 const c = data.campaign || {};
 const s = data.summary || {}, p = data.percentages || {};
 const days = Object.entries(data.timeline || {}).slice(-7).map(([day,v]) => ({ label:day.slice(5), value:v.sent||0, color:'#2563eb' }));
 // Live counters while the audience is copied in chunks. When the backend is
 // slow or unreachable the poll backs off (15s → 30s → 60s) instead of hammering
 // it every 15 seconds and flooding the console with timeout errors.
 const [pollDelay, setPollDelay] = useState(15000);
 useEffect(() => {
  if (!id) return;
  let alive = true;
  const tick = async () => {
   try {
    const r = await getStrict(`/campaigns/${encodeURIComponent(id)}/progress`);
    if (alive) { setProg(r); setPollDelay(d => (d === 15000 ? d : 15000)); }
   } catch { if (alive) setPollDelay(d => Math.min(60000, d * 2)); }
  };
  tick();
  const t = setInterval(tick, pollDelay);
  return () => { alive = false; clearInterval(t); };
 }, [id, pollDelay]);
 const launch = async () => { try { const r = await post(`/campaigns/${id}/launch`,{confirm:true}); toast(r.message || `${r.queued||0} recipients queued`); load(); }
  catch(e){ notify(toast, e); } };
 const cancelSchedule = async () => { try { const r = await del(`/campaigns/${encodeURIComponent(id)}/schedule`); toast(r.message || 'Schedule cancelled'); load(); }
  catch(e){ notify(toast, e); } };
 const saveSenders = async () => {
  if (!senderSel.length) { toast('Pick at least one mailbox'); return; }
  setSendersBusy(true);
  try {
   const r = await patch(`/campaigns/${encodeURIComponent(id)}/senders`, { accountPool: senderSel });
   toast(r?.message || 'Sender pool updated — next email uses the new mailboxes');
   load();
  } catch (e) { notify(toast, e); } finally { setSendersBusy(false); }
 };

 const pause = async () => { try { await post(`/campaigns/${id}/pause`,{}); toast('Campaign paused'); load(); }
  catch(e){ notify(toast, e); } };
 const runPreflight = async () => { try { setPreflight(await post(`/campaigns/${id}/preflight`,{})); }
  catch(e){ notify(toast, e); } };
 const sendTest = async () => { try { const r = await post(`/campaigns/${id}/test-send`,{email:testEmail}); setTestResult(r); toast('Test accepted by the provider; check the inbox'); load(); }
  catch(e){ notify(toast, e); } };

 const cards = [
  ['Queued',s.queued||0,`${p.progress||0}% complete`,'#7c3aed'],
  ['Sent',s.sent||0,'accepted by provider','#2563eb'],
  ['Delivered',s.delivered||0,`${pct(p.delivery)} delivery rate${data.deliveryEstimated?' (est.)':''}`,'#0f9d6e'],
  ['Opened',s.opened||0,`${pct(p.open)} of delivered`,'#b58a3a'],
  ['Clicked',s.clicked||0,`${pct(p.click)} of delivered`,'#1d9d9d'],
  ['Bounced',s.bounced||0,`${pct(p.bounce)} bounce rate`,'#d64550'],
  ['Complained',s.complained||0,`${pct(p.complaint)} complaint rate`,'#d64550'],
  ['Unsubscribed',s.unsubscribed||0,`${pct(p.unsubscribe)} opt-out rate`,'#b7791f']
 ];

 // Data still arriving → show the skeleton, never a fake "No activity yet".
 if (!loaded) return <DashboardSkeleton variant="overview" />;

 return <>
  <PageHead title={c.name || 'Campaign details'} subtitle={`${c.stream || 'campaign'} · ${c.status || 'loading'} · ${data.recipients||0} recipients`}
   actions={<div className="row"><Link className="btn secondary sm" href="/dashboard/campaigns"><Icon name="chevron" size={14}/> Back</Link>
    <button className="btn ghost sm" onClick={runPreflight}><Icon name="check" size={14}/> Preflight</button>
    <button className="btn secondary sm" onClick={()=>{setTestOpen(true);setTestResult(null);setTestEmail('');}}><Icon name="mail" size={14}/> Send test</button>
    {['draft','paused','scheduled'].includes(c.status)
      ? <button className="btn sm" onClick={launch}><Icon name="bolt" size={14}/> {c.status==='scheduled'?'Launch now':'Launch'}</button>
      : c.status === 'queued' ? <button className="btn ghost sm" onClick={pause}>Pause</button> : null}
   </div>}/>

  {c.status === 'scheduled' && c.startAt && <div className="notice" style={{marginTop:12}}>
   <b>Scheduled</b> — this campaign starts automatically <b>{new Date(c.startAt).toLocaleString()}</b>. Nothing sends before that.
   <div className="row" style={{gap:8,marginTop:10}}>
    <button className="btn sm" onClick={launch}>Launch now</button>
    <button className="btn ghost sm" onClick={cancelSchedule}>Cancel schedule</button>
   </div>
  </div>}

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
   <div className="muted" style={{fontSize:11,marginTop:6}}>{p.progress||0}% of audience {c.status==='completed' ? 'processed — campaign complete' : 'handed to sending'} · {c.sendMode === 'blast' ? 'blast mode — sends at plan speed' : 'human cadence always on'}</div>
  </div>

  {['queued','paused'].includes(c.status) &&
   (data.mailboxIssues?.length > 0 || data.blocked || c.pauseReason === 'high_bounce_rate') &&
   <div className="notice warn" style={{marginTop:14}}>
    {c.pauseReason === 'high_bounce_rate' ? <>
      <b>Paused automatically:</b> {c.pauseDetail || 'bounce rate too high'}.
      The bounced addresses are suppressed and will not be sent again — review the audience,
      then press <b>Launch</b> to resume.
    </> : <>
    <b>Sending is paused:</b>{' '}
    {data.mailboxIssues?.length > 0
      ? data.mailboxIssues.map(m =>
          `${m.fromEmail} — ${m.status === 'reauth_required'
            ? 'login failed, reconnect needed'
            : m.limitedUntil && Date.parse(m.limitedUntil) > Date.now()
              ? `cooling down until ${new Date(m.limitedUntil).toLocaleTimeString()}`
              : 'cooling down'}`).join(' · ')
      : ({ no_active_account: 'no mailbox is available right now',
           campaign_schedule: 'outside your sending window',
           rate_limit: 'provider rate limit reached',
           paused: 'the campaign is paused' }[data.blocked.reason] || data.blocked.reason)}
    .{' '}
    {data.mailboxIssues?.length > 0
      ? <>Fix it from <Link href="/dashboard/accounts">Mail accounts</Link> — sending resumes by itself.</>
      : 'Sending resumes automatically.'}
    </>}
   </div>}

  {pace && <div className="card luxe-card" style={{marginTop:14}}>
   <div className="mini-row">
    <h2 style={{margin:0}}>Sending pace</h2>
    <span className="badge">read-only · how this campaign sends</span>
   </div>
   <div className="row" style={{gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
    <span className="muted" style={{fontSize:12,fontWeight:600}}>Mode</span>
    <span className={`chip ${(c.sendMode||'human')==='blast'?'chip-active':''}`}>{(c.sendMode||'human')==='blast'?'Blast':'Human-paced'}</span>
    <span className="muted" style={{fontSize:11.5}}>
     {(c.sendMode||'human')==='blast'
      ? 'Blast sends everything back-to-back inside the sending window.'
      : 'One email at a time with a natural pause between sends.'}
    </span>
   </div>
   <div className="row" style={{gap:14,marginTop:12,flexWrap:'wrap'}}>
    {(c.sendMode||'human')!=='blast' && <div style={{minWidth:120}}>
     <div className="muted" style={{fontSize:11}}>Pause between emails</div>
     <b>{pace.gapSeconds}s</b></div>}
    <div style={{minWidth:120}}>
     <div className="muted" style={{fontSize:11}}>Daily limit</div>
     <b>{pace.dailyCap}/mailbox/day</b></div>
    <div style={{minWidth:170}}>
     <div className="muted" style={{fontSize:11}}>Sending window</div>
     <b>{pace.startTime}–{pace.endTime}</b>
     <div className="muted" style={{fontSize:11}}>
      {(pace.daysOfWeek||[]).length>=7?'every day':(pace.daysOfWeek||[]).map(d=>['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]||d).join(', ')}
      {' · '}{(pace.timezone||'').replaceAll('_',' ')}
     </div>
    </div>
   </div>
   {data.paceActual?.firstAt ? <div className="row" style={{gap:14,marginTop:14,flexWrap:'wrap'}}>
    <div style={{minWidth:150}}>
     <div className="muted" style={{fontSize:11}}>Actual — first send</div>
     <b style={{fontSize:13}}>{new Date(data.paceActual.firstAt).toLocaleString()}</b></div>
    <div style={{minWidth:150}}>
     <div className="muted" style={{fontSize:11}}>Last send</div>
     <b style={{fontSize:13}}>{new Date(data.paceActual.lastAt).toLocaleString()}</b></div>
    <div style={{minWidth:90}}>
     <div className="muted" style={{fontSize:11}}>Sent</div>
     <b>{Number(data.paceActual.sent||0).toLocaleString()}</b></div>
    {data.paceActual.avgGapSec ? <div style={{minWidth:90}}>
     <div className="muted" style={{fontSize:11}}>Avg gap</div>
     <b>{data.paceActual.avgGapSec>=60?`${Math.round(data.paceActual.avgGapSec/60)} min`:`${data.paceActual.avgGapSec}s`}</b></div> : null}
    {data.paceActual.perHour ? <div style={{minWidth:100}}>
     <div className="muted" style={{fontSize:11}}>Throughput</div>
     <b>{Number(data.paceActual.perHour).toLocaleString()}/hr</b></div> : null}
   </div> : <div className="muted" style={{fontSize:12,marginTop:12}}>No sends yet — the actual pace appears once the first email goes out.</div>}
   <div className="notice" style={{marginTop:12}}>
    Pace is fixed while the campaign runs. This card shows how sending <b>actually happened</b> — it cannot be changed here.
   </div>
  </div>}

  {['queued','paused'].includes(c.status) && <div className="card luxe-card" style={{marginTop:14}}>
   <div className="mini-row"><h2 style={{margin:0}}>Sending from</h2><span className="badge ok">applies to the next email</span></div>
   <p className="muted" style={{fontSize:12,marginTop:4}}>Swap the sender mailboxes of this running campaign — no pause or relaunch needed. Unsubscribed and bounced contacts are never sent, whatever the pool.</p>
   <div className="row" style={{gap:8,flexWrap:'wrap',marginTop:10}}>
    {senderAccounts.length ? senderAccounts.map(a=>{
     const blocked = a.status!=='active' && a.status!=='limited';
     const inPool = senderSel.includes(a._id);
     // Broken pool members stay visible and removable (they were hidden before,
     // so a stale bad mailbox could never be deselected and every save failed).
     const selectable = !blocked || inPool;
     const title = a.status==='limited' ? `Cooling down — resumes automatically${a.limitedUntil?` after ${new Date(a.limitedUntil).toLocaleTimeString()}`:''}`
      : blocked ? `${a.status}${a.lastError?` — ${a.lastError}`:''}` : '';
     return (
      <label key={a._id} className={`chip ${inPool?'chip-active':''}`} title={title}
       style={{cursor:selectable?'pointer':'not-allowed',opacity:selectable?1:.55}}>
       <input type="checkbox" style={{marginRight:6}} checked={inPool} disabled={!selectable}
        onChange={()=>setSenderSel(s=>s.includes(a._id)?s.filter(x=>x!==a._id):[...s,a._id])}/>
       {a.fromEmail}
       {a.status==='limited' && <span className="badge" style={{marginLeft:6}}>cooling down</span>}
       {blocked && <span className="badge badge-amber" style={{marginLeft:6}}>{a.status.replace(/_/g,' ')}</span>}
      </label>);
    }) : <span className="muted">No mailboxes yet — add one on Mail accounts.</span>}
   </div>
   {senderAccounts.some(a=>a.status!=='active'&&a.status!=='limited') && <div className="muted" style={{fontSize:11,marginTop:6}}>Greyed mailboxes need attention on Mail accounts — they can’t be added until fixed (existing pool members can still be removed here).</div>}
   <div className="row" style={{marginTop:12,gap:10,alignItems:'center'}}>
    <button className="btn sm" disabled={sendersBusy || !senderSel.length} onClick={saveSenders}>
     {sendersBusy?'Saving…':'Save senders'}</button>
    <span className="muted" style={{fontSize:11.5}}>{(c.accountPool||[]).length} mailbox(es) in use now</span>
   </div>
  </div>}

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
     <div><span className="stat-label">Delivery</span><b>{pct(p.delivery)}{data.deliveryEstimated?' est.':''}</b></div>
     <div><span className="stat-label">Open</span><b>{pct(p.open)}</b></div>
     <div><span className="stat-label">Click</span><b>{pct(p.click)}</b></div>
     <div><span className="stat-label">Bounce</span><b style={{color:'var(--danger)'}}>{pct(p.bounce)}</b></div>
     <div><span className="stat-label">Complaint</span><b style={{color:'var(--danger)'}}>{pct(p.complaint)}</b></div>
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
   <div className="mini-row">
    <h2 style={{margin:0}}>Full event stream <span className="muted" style={{fontSize:12,fontWeight:400}}>· {leads.length} lead{(leads.length===1?'':'s')} · click a lead to expand</span></h2>
    <div className="row" style={{gap:8}}>
     <button className="btn ghost sm" onClick={() => setOpenLeads(allOpen ? new Set() : new Set(leads.map(l => l.email)))} disabled={!leads.length}>
      {allOpen ? 'Collapse all' : 'Expand all'}
     </button>
     <button className="btn ghost sm" onClick={load} disabled={busy}><Icon name="refresh" size={14}/> Refresh</button>
    </div>
   </div>
   <div className="table-card"><table><thead><tr><th style={{width:'46%'}}>Lead</th><th>Events</th><th>Latest</th><th>Last seen</th></tr></thead><tbody>
    {leads.map(({ email, events, latest }) => (
     <Fragment key={email}>
      <tr className="lead-row" onClick={() => toggleLead(email)} aria-expanded={openLeads.has(email)}>
       <td><span className="lead-caret">{openLeads.has(email) ? '▾' : '▸'}</span><b>{email}</b></td>
       <td>{events.length}</td>
       <td><span className={`badge ${tone(latest.type)}`}>{latest.type}</span></td>
       <td className="muted">{latest.createdAt?.replace('T',' ').slice(0,19)||'—'}</td>
      </tr>
      {openLeads.has(email) && events.map((e, i) => (
       <tr key={e._id || i} className="lead-event">
        <td colSpan={4}>
         <div className="row" style={{gap:10,flexWrap:'wrap',fontSize:12}}>
          <span className={`badge ${tone(e.type)}`}>{e.type}</span>
          <span className="muted">{e.createdAt?.replace('T',' ').slice(0,19)||'—'}</span>
          <span className="mono">{e.messageId?.slice(0,12)||'—'}</span>
          <span className="muted">{e.provider||'—'}</span>
          <span className="muted">{e.url||e.scope||e.classification||e.note||''}</span>
         </div>
        </td>
       </tr>
      ))}
     </Fragment>
    ))}
    {!leads.length && <tr><td colSpan={4}><div className="empty">No events yet — launch or send a test.</div></td></tr>}
   </tbody></table></div>
   <div className="row" style={{justifyContent:'space-between',alignItems:'center',marginTop:10,flexWrap:'wrap',gap:8}}>
    <span className="muted" style={{fontSize:11.5}}>
     Showing {Number((data.events||[]).length).toLocaleString()} of {Number(data.eventsTotal||0).toLocaleString()} events
    </span>
    {(data.eventsTotal||0) > (data.events||[]).length
     ? <button className="btn secondary sm" disabled={busy} onClick={loadMoreEvents}>{busy?'Loading…':'Load more events'}</button>
     : <span className="muted" style={{fontSize:11.5}}>All events loaded</span>}
   </div>
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

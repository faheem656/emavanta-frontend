'use client';
import { useEffect, useRef, useState } from 'react';
import { get, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const fmt = iso => iso ? new Date(iso).toLocaleTimeString() : '—';

export default function Ops(){
 const toast = useToast();
 const [slo,setSlo] = useState(null);
 const [metrics,setMetrics] = useState({});
 const [outbox,setOutbox] = useState([]);
 const [jobs,setJobs] = useState([]);
 const [recon,setRecon] = useState([]);
 const [live,setLive] = useState(null);
 const [pulse,setPulse] = useState(false);
 const [auto,setAuto] = useState(true);
 const [busy,setBusy] = useState('');
 const [loaded,setLoaded] = useState(false);
 const timer = useRef(null);

 const load = () => {
  Promise.allSettled([
   get('/observability/slo').then(r => setSlo(r && !Array.isArray(r) ? r : null)),
   get('/observability/metrics').then(r => setMetrics(r && !Array.isArray(r) ? r : {})),
   get('/outbox/events?limit=25').then(r => setOutbox(arr(r))),
   get('/scheduler/jobs').then(r => setJobs(arr(r))),
   get('/reconciliation/status').then(r => setRecon(arr(r))),
   get('/analytics/overview').then(r => { if(r && !Array.isArray(r)) setLive(r); })
  ]).then(() => setLoaded(true));
  setPulse(true); setTimeout(() => setPulse(false), 700);
 };
 useEffect(() => {
  load();
  timer.current = setInterval(() => { if (auto) load(); }, 8000);
  return () => clearInterval(timer.current);
 }, [auto]);

 const pending = outbox.filter(e => e.status !== 'published').length;
 const failed = jobs.filter(j => j.status === 'failed').length;

 if (!loaded) return <DashboardSkeleton variant="overview" />;

 return <>
  <PageHead title="Operations" subtitle="Live queue health, SLOs, outbox and reconciliation"
   actions={<><button className="btn ghost sm" onClick={load}><Icon name="refresh" size={14}/> Refresh</button>
    <label className="live-toggle"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>
     <span className={`live-dot ${auto?'on':''} ${pulse?'pulse':''}`}/> Live {auto?'· 8s':'· paused'}</label>
    <button className="btn sm" onClick={async()=>{ setBusy('recon'); try{await post('/reconciliation/run',{});toast('Reconciliation queued');load();}catch(e){notify(toast,e);} finally{setBusy('');} }}>
     {busy==='recon'?'Running…':'Reconcile events'}</button></>}/>

  <div className="stat-strip">
   <div className="card luxe-card"><div className="stat-label">Queued emails</div><div className="stat">{live?.stats?.queued ?? 0}</div>
    <p className="muted">from the live campaign runner</p></div>
   <div className="card luxe-card"><div className="stat-label">Sent (30d)</div><div className="stat">{live?.stats?.sent ?? 0}</div>
    <p className="muted">{live?.stats?.delivered ?? 0} confirmed delivered</p></div>
   <div className="card luxe-card"><div className="stat-label">Outbox pending</div><div className="stat">{pending}</div>
    <p className="muted">{outbox.length} recent event(s)</p></div>
   <div className="card luxe-card"><div className="stat-label">Failed jobs</div><div className="stat" style={{ color: failed ? '#d64550' : undefined }}>{failed}</div>
    <p className="muted">{jobs.length} scheduled job(s)</p></div>
  </div>

  {slo?.slos && <div className="grid" style={{ marginTop:16 }}>
   {Object.entries(slo.slos).map(([k,v])=><div className="card luxe-card" key={k}>
    <div className="stat-label" style={{ textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</div>
    <div className="stat" style={{ fontSize:24 }}>{v.target}<small style={{ fontSize:12 }}> {v.unit}</small></div>
    <div className="muted" style={{ fontSize:12 }}>window {v.window} · runbook <code>{v.runbook}</code></div>
   </div>)}
  </div>}

  <div className="grid" style={{ gridTemplateColumns:'1.2fr .8fr', alignItems:'start', marginTop:16 }}>
   <div className="card table-card luxe-card" style={{ padding:18 }}>
    <div className="mini-row"><h2 style={{ margin:0 }}>Outbox events</h2>
     <span className="badge">{outbox.filter(e=>e.status==='published').length} published</span></div>
    {outbox.length ? <table><thead><tr><th>Type</th><th>Status</th><th>Created</th></tr></thead><tbody>
     {outbox.map(e=><tr key={e._id}><td>{e.type}</td>
      <td><span className={`badge ${e.status==='published'?'ok':'warn'}`}>{e.status||'pending'}</span></td>
      <td className="muted">{fmt(e.createdAt)}</td></tr>)}
    </tbody></table> : <div className="empty">No outbox events yet — launch a campaign to see them flow.</div>}
   </div>

   <div className="card luxe-card">
    <h2>Metric dictionary</h2>
    <div className="metric-list">
     {Object.entries(metrics).slice(0,8).map(([k,v])=><div className="metric-row" key={k}>
      <code>{k}</code><span className="muted">{String(v)}</span></div>)}
     {!Object.keys(metrics).length && <div className="empty">Loading metrics…</div>}
    </div>
   </div>
  </div>

  <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', alignItems:'start', marginTop:16 }}>
   <div className="card table-card luxe-card" style={{ padding:18 }}>
    <h2>Scheduled jobs</h2>
    {jobs.length ? <table><thead><tr><th>Type</th><th>Run at</th><th>Status</th></tr></thead><tbody>
     {jobs.slice(0,10).map(j=><tr key={j._id}><td>{j.type}</td><td className="muted">{fmt(j.runAt)}</td>
      <td><span className={`badge ${j.status==='failed'?'danger':j.status==='done'?'ok':'warn'}`}>{j.status}</span></td></tr>)}
    </tbody></table> : <div className="empty">Nothing scheduled right now</div>}
   </div>
   <div className="card table-card luxe-card" style={{ padding:18 }}>
    <h2>Reconciliation</h2>
    {recon.length ? <table><thead><tr><th>Backfilled</th><th>Checked</th><th>At</th></tr></thead><tbody>
     {recon.map(r=><tr key={r._id}><td>{r.backfilled}</td><td>{r.checked}</td><td className="muted">{fmt(r.createdAt)}</td></tr>)}
    </tbody></table> : <div className="empty">No reconciliation runs yet</div>}
   </div>
  </div>
 </>;
}

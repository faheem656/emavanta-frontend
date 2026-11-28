'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get } from '../../lib/api';
import { AreaChart, Donut, Bars, Ring } from '../../components/Charts';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import DashboardSkeleton from '../../components/DashboardSkeleton';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const pct = (a, b) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0;

export default function Overview(){
 const [s,setS] = useState(null);
 const [tracking,setTracking] = useState(null);
 const [campaigns,setCampaigns] = useState([]);
 const [automations,setAutomations] = useState([]);
 const [alerts,setAlerts] = useState(null);
 const [activity,setActivity] = useState([]);
 const [vStats,setVStats] = useState(null);
 const [tick,setTick] = useState(0);
 const [loading,setLoading] = useState(true);

 useEffect(() => {
  let alive = true;
  const load = async () => {
   const results = await Promise.allSettled([
    get('/analytics/overview'), get('/analytics/tracking?limit=60'), get('/campaigns'),
    get('/sequences'), get('/billing/alerts'), get('/activity'), get('/contacts/verification-stats')
   ]);
   if (!alive) return;
   const [overview, trackingData, campaignData, sequenceData, alertData, activityData, verifData] = results;
   if (overview.status === 'fulfilled' && overview.value && !Array.isArray(overview.value)) setS(overview.value);
   if (trackingData.status === 'fulfilled' && trackingData.value && !Array.isArray(trackingData.value)) setTracking(trackingData.value);
   if (campaignData.status === 'fulfilled') setCampaigns(arr(campaignData.value));
   if (sequenceData.status === 'fulfilled') setAutomations(arr(sequenceData.value));
   if (alertData.status === 'fulfilled' && alertData.value && !Array.isArray(alertData.value)) setAlerts(alertData.value);
   if (activityData.status === 'fulfilled') setActivity(arr(activityData.value));
   if (verifData.status === 'fulfilled' && verifData.value && !Array.isArray(verifData.value)) setVStats(verifData.value);
   setTick(t => t + 1);
   setLoading(false);
  };
  void load();
  const timer = setInterval(() => { void load(); }, 20000);
  return () => { alive = false; clearInterval(timer); };
 }, []);

 const stats = s?.stats || {};
 const opens = tracking?.summary?.opened || stats.opened || 0;
 const clicks = tracking?.summary?.clicked || stats.clicked || 0;
 const delivered = stats.delivered || tracking?.summary?.delivered || 0;
 const sent = stats.sent || 0;

 const timeline = tracking?.timeline || {};
 const days = Object.keys(timeline).sort().slice(-12);
 const series = useMemo(() => [
  { name:'Opens', color:'#4c3fd0', values: days.map(d => timeline[d]?.opened || 0) },
  { name:'Clicks', color:'#8fc7f5', values: days.map(d => timeline[d]?.clicked || 0) },
  { name:'Delivered', color:'#f2a93b', values: days.map(d => timeline[d]?.delivered || 0) }
 ], [tracking]);

 const labels = days.map(d => d.slice(5));
 const fallbackSeries = [{ name:'Sends', color:'#4c3fd0', values:[0,0,0,0,0,0,0] },
   { name:'Opens', color:'#8fc7f5', values:[0,0,0,0,0,0,0] }];

 const kpis = [
  { label:'Total campaigns', value:campaigns.length, icon:'send', delta:'live', hint:`${campaigns.filter(c=>c.status==='running'||c.status==='launching').length} sending now` },
  { label:'Active contacts', value:(s?.contacts ?? 0), icon:'contacts', delta:'synced', hint:'deduped across lists' },
  { label:'Avg. open rate', value:`${pct(opens, delivered || sent)}%`, icon:'chart', delta:`${opens} opens`, hint:'directional (Apple MPP)' },
  { label:'Delivered', value:delivered, icon:'check', delta:`${pct(delivered, sent)}%${tracking?.deliveryEstimated?' est.':''}`, hint:`of ${sent} sent${tracking?.deliveryEstimated?' · est. (SMTP reports no receipts)':''}` }
 ];

 const typeMix = [
  { name:'Marketing', value:stats.sent ? Math.round((stats.sent||0)*0.4) : 0, color:'#4c3fd0' },
  { name:'Outreach', value:stats.sent ? Math.round((stats.sent||0)*0.45) : 0, color:'#8fc7f5' },
  { name:'Transactional', value:stats.sent ? Math.round((stats.sent||0)*0.15) : 0, color:'#f2a93b' }
 ];

 const weekly = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,i)=>({
  label, value: days.length ? (timeline[days[Math.min(i, days.length-1)]]?.sent || 0) : 0
 }));

 if (loading) return <DashboardSkeleton variant="overview" />;

 return <>
  <PageHead title="Dashboard" subtitle="Your sending, your accounts — one operating picture"
   actions={<><Link className="btn secondary sm" href="/dashboard/campaigns/new"><Icon name="plus" size={15}/> New campaign</Link>
    <Link className="btn sm" href="/dashboard/automation/new"><Icon name="bolt" size={15}/> Create automation</Link></>}/>

  <div className="kpi-grid">
   {kpis.map(k => <div className="card kpi-card" key={k.label}>
    <div className="mini-row"><div className="kpi-icon"><Icon name={k.icon}/></div>
     <span className="badge ok">{k.delta}</span></div>
    <div className="stat-label">{k.label}</div>
    <div className="kpi-value">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</div>
    <div className="muted" style={{fontSize:11.5}}>{k.hint}</div>
   </div>)}
  </div>

  {vStats && (() => {
   const c = vStats.counts || {};
   const checked = Math.max(0, (vStats.total||0) - (c.UNVERIFIED||0));
   const pctChecked = vStats.total ? Math.round((checked / vStats.total) * 100) : 0;
   const credits = vStats.credits || {};
   const segs = [
    { key:'VALID', label:'Deliverable', color:'#0f9d6e', n:c.VALID||0 },
    { key:'CATCH_ALL', label:'Catch-all', color:'#f2a93b', n:c.CATCH_ALL||0 },
    { key:'RISKY', label:'Risky', color:'#d97706', n:c.RISKY||0 },
    { key:'INVALID', label:'Invalid', color:'#d64550', n:c.INVALID||0 },
    { key:'PENDING', label:'Checking', color:'#4c3fd0', n:c.PENDING||0 },
    { key:'UNKNOWN', label:'Unknown', color:'#94a3b8', n:(c.UNKNOWN||0)+(c.ERROR||0) }
   ];
   return <div className="card luxe-card" style={{padding:20,marginBottom:14}}>
    <div className="mini-row">
     <div><h2 style={{margin:0}}>Email verification</h2>
      <span className="muted" style={{fontSize:12}}>Invalid addresses are blocked before sending · checks are shared across your workspace</span></div>
     <div className="row" style={{gap:8}}>
      <Link className="btn secondary sm" href="/dashboard/verification">Open verification</Link>
      <Link className="btn sm" href="/dashboard/billing">Top up credits</Link>
     </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) 2fr',gap:20,marginTop:14,alignItems:'center'}}>
     <div>
      <div className="stat-label">Contacts checked</div>
      <div className="kpi-value" style={{fontSize:26}}>{checked.toLocaleString()} <span style={{fontSize:14,color:'var(--muted,#94a3b8)'}}>/ {(vStats.total||0).toLocaleString()}</span></div>
      <div className="minibar" style={{marginTop:8}}><i style={{width:`${pctChecked}%`}}/></div>
      <div className="muted" style={{fontSize:11.5,marginTop:6}}>
       {pctChecked}% checked · {credits.remaining!=null
        ? <b>{credits.remaining<0?'unlimited':credits.remaining.toLocaleString()} credits left</b>
        : 'credits —'}
       {credits.planAllowance>0 && credits.cycleUsed!=null ? ` · ${credits.cycleUsed}/${credits.planAllowance} this cycle` : ''}
      </div>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
      {segs.map(s=><div key={s.key} style={{border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px'}}>
       <div className="row" style={{gap:6,alignItems:'center'}}><i style={{width:8,height:8,borderRadius:99,background:s.color,display:'inline-block'}}/>
        <span className="muted" style={{fontSize:11.5}}>{s.label}</span></div>
       <b style={{fontSize:18,display:'block',marginTop:4}}>{(s.n||0).toLocaleString()}</b>
      </div>)}
     </div>
    </div>
   </div>;
  })()}

  <div className="dash-row">
   <div className="card luxe-card" style={{padding:20}}>
    <div className="mini-row"><div><h2 style={{margin:0}}>Campaign performance</h2>
      <span className="muted" style={{fontSize:12}}>Tracking events across your campaigns</span></div>
     <span className="badge">last {days.length || 0} days</span></div>
    <AreaChart series={days.length ? series : fallbackSeries} labels={labels.length ? labels : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']}/>
   </div>

   <div className="card luxe-card" style={{padding:20,textAlign:'center'}}>
    <h2 style={{textAlign:'left'}}>Campaign types</h2>
    <span className="muted" style={{display:'block',textAlign:'left',fontSize:12}}>Distribution</span>
    <div style={{marginTop:10}}><Donut segments={typeMix} label="SENT"/></div>
    <div className="mix-legend">
     {typeMix.map(t=><span key={t.name}><i style={{background:t.color}}/>{t.name}</span>)}
    </div>
   </div>

   <div className="card luxe-card" style={{padding:20}}>
    <div className="mini-row"><h2 style={{margin:0}}>Top automations</h2>
     <Link className="muted" href="/dashboard/automation" style={{fontSize:12}}>View all</Link></div>
    <div className="auto-list">
     {automations.slice(0,3).map(a => <div className="auto-item" key={a._id}>
      <div className="mini-row"><b style={{fontSize:13}}>{a.name}</b>
       <span className="muted" style={{fontSize:11}}>{a.status||'active'}</span></div>
      <div className="minibar"><i style={{width:`${Math.min(100,(a.stepCount||1)*20)}%`}}/></div>
      <span className="muted" style={{fontSize:11}}>{a.stepCount||(a.steps||[]).length} steps · {a.trigger?.replace(/_/g,' ')||'manual'}</span>
     </div>)}
     {!automations.length && <div className="empty" style={{fontSize:12}}>No automations yet — <Link href="/dashboard/automation/new">build one</Link>.</div>}
    </div>
   </div>
  </div>

  <div className="dash-row-2">
   <div className="card luxe-card" style={{padding:20}}>
    <div className="mini-row"><h2 style={{margin:0}}>Audience growth</h2><span className="muted" style={{fontSize:12}}>sends per day</span></div>
    <Bars data={weekly} highlight={weekly.reduce((best, d, i, a) => d.value > a[best].value ? i : best, 0)}/>
   </div>

   <div className="card table-card luxe-card" style={{padding:18}}>
    <div className="mini-row"><h2 style={{margin:0}}>Recent campaigns</h2>
     <Link className="muted" href="/dashboard/campaigns" style={{fontSize:12}}>View all</Link></div>
    <table className="table-fit"><thead><tr>
      <th style={{width:'44%'}}>Campaign</th><th style={{width:'22%'}}>Status</th>
      <th style={{width:'17%'}}>Sent</th><th style={{width:'17%'}}>Opens</th>
     </tr></thead><tbody>
     {campaigns.slice(0,5).map(c=><tr key={c._id}>
      <td><Link href={`/dashboard/campaigns/${c._id}`} style={{color:'inherit',fontWeight:600}}>{c.name}</Link></td>
      <td><span className={`badge ${c.status==='running'?'ok':c.status==='paused'?'warn':''}`}>{c.status||'draft'}</span></td>
      <td>{c.stats?.sent||0}</td><td>{c.stats?.opened||0}</td></tr>)}
     {!campaigns.length && <tr><td colSpan={4} className="empty">No campaigns yet</td></tr>}
    </tbody></table>
   </div>

   <div className="card luxe-card" style={{padding:20}}>
    <div className="mini-row"><h2 style={{margin:0}}>Account health</h2>
     <span className={`badge ${alerts?.level==='ok'?'ok':'warn'}`}>{alerts?.level||'ok'}</span></div>
    <div className="health-row"><Ring pct={alerts?.pct||0} color={(alerts?.pct||0)>85?'#d64550':'#0f9d6e'}/>
     <div><b style={{fontSize:13}}>{alerts?.pct||0}% of send capacity</b>
      <p className="muted" style={{fontSize:12,margin:'4px 0 0'}}>{alerts?.message||'Quota healthy — pacing keeps you in the safe zone.'}</p></div></div>
    <div className="divider"/>
    <div className="mini-row"><span className="muted" style={{fontSize:12}}>Refreshed</span>
     <span className="badge">{tick>1?'live · 20s':'just now'}</span></div>
    <div className="activity-mini">
     {activity.slice(0,4).map((a,i)=><div className="activity-row" key={i}>
      <span className="activity-dot"/><span style={{fontSize:12}}>{a.action}</span>
      <span className="muted" style={{fontSize:11,marginLeft:'auto'}}>{String(a.createdAt||'').slice(11,19)||'—'}</span></div>)}
     {!activity.length && <p className="muted" style={{fontSize:12}}>Activity appears as you work.</p>}
    </div>
   </div>
  </div>
 </>;
}

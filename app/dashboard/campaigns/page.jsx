'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Modal from '../../../components/Modal';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const cadence = c => {
  const p = c.sendPolicy || {};
  return `${p.minDelaySec || 45}–${p.maxDelaySec || 90}s · ${p.dailyCap || 50}/day`;
};
const statusTone = s => s === 'queued' ? 'ok' : s === 'paused' ? 'warn' : s === 'completed' ? 'ok' : '';

export default function Campaigns(){
 const toast = useToast();
 const [items,setItems] = useState([]);
 const [accounts,setAccounts] = useState([]);
 const [templates,setTemplates] = useState([]);
 const [lists,setLists] = useState([]);
 const [filter,setFilter] = useState('all');
 const [search,setSearch] = useState('');
 const [createOpen,setCreateOpen] = useState(false);
 const [launchTarget,setLaunchTarget] = useState(null);
 const [launchInfo,setLaunchInfo] = useState(null);
 const [preflight,setPreflight] = useState(null);
 const [testTarget,setTestTarget] = useState(null);
 const [testEmail,setTestEmail] = useState('');
 const [testResult,setTestResult] = useState(null);
 const [msg,setMsg] = useState('');
 const [form,setForm] = useState({ name:'', stream:'outreach', templateId:'demo-template', listIds:['demo-list'],
   accountPool:['demo-account'], rotation:'sticky_by_contact', minDelaySec:45, maxDelaySec:90, dailyCap:50 });

 const load = () => {
  get('/campaigns').then(r => setItems(arr(r)));
  get('/accounts').then(r => setAccounts(arr(r)));
  get('/templates').then(r => setTemplates(arr(r)));
  get('/contacts/lists').then(r => setLists(arr(r)));
 };
 useEffect(() => { load(); }, []);

 const stats = useMemo(() => {
  const sent = items.reduce((n,c)=>n+(c.stats?.sent||0),0);
  const queued = items.reduce((n,c)=>n+(c.stats?.queued||0),0);
  const replied = items.reduce((n,c)=>n+(c.stats?.replied||0),0);
  const active = items.filter(c=>c.status==='queued').length;
  return { sent, queued, replied, active, rate: sent ? ((replied/sent)*100).toFixed(1) : '0.0' };
 }, [items]);

 const visible = items.filter(c => (filter==='all'||c.status===filter)
   && (!search || c.name.toLowerCase().includes(search.toLowerCase())));

 const create = async () => {
  if (!form.name.trim()) { toast('Give the campaign a name','warn'); return; }
  if (!form.listIds.length || !form.accountPool.length) { toast('Select at least one list and sending account','warn'); return; }
  try {
   const c = await post('/campaigns', { name:form.name.trim(), stream:form.stream,
    templateId: form.templateId || 'demo-template',
    listIds: form.listIds, accountPool: form.accountPool, rotation: form.rotation,
    sendPolicy: { minDelaySec:Number(form.minDelaySec), maxDelaySec:Number(form.maxDelaySec),
      jitterPct:20, dailyCap:Number(form.dailyCap), weeklyCap:Number(form.dailyCap)*5,
      pauseOnReply:true, weekend:false } });
   setCreateOpen(false);
   setForm(f=>({...f,name:''}));
   toast('Campaign draft created — review and launch when ready');
   load();
   const check = await post(`/campaigns/${c._id}/preflight`, {});
   if (check && check.ok === false) toast(`Preflight note: ${check.issues?.[0]?.code || 'review needed'}`,'warn');
  } catch(e) { notify(toast, e); }
 };

 const askLaunch = async c => {
  setLaunchTarget(c); setLaunchInfo(null);
  try { const info = await post(`/campaigns/${c._id}/launch`, { confirm:false }); setLaunchInfo(info); }
  catch(e) { setLaunchTarget(null); notify(toast, e); }
 };
 const confirmLaunch = async () => {
  try { const r = await post(`/campaigns/${launchTarget._id}/launch`, { confirm:true });
   toast(`${r.queued||0} recipients queued in ${r.batches||0} batches`);
   setLaunchTarget(null); load();
  } catch(e) { notify(toast, e); }
 };
 const runPreflight = async c => {
  try { const r = await post(`/campaigns/${c._id}/preflight`, {}); setPreflight({ campaign:c, result:r }); }
  catch(e) { notify(toast, e); }
 };
 const pause = async c => { try { await post(`/campaigns/${c._id}/pause`,{}); toast('Campaign paused'); load(); }
  catch(e) { notify(toast, e); } };

 const removeCampaign = async c => {
  if(!window.confirm(`Delete “${c.name}”? Campaign record will be removed; associated history may remain.`)) return;
  try { await import('../../../lib/api').then(m => m.del(`/campaigns/${c._id}`)); toast('Campaign deleted'); load(); }
  catch(e){ notify(toast, e); }
 };

 const toggleIn = (key,value) => setForm(f => ({...f,[key]: f[key].includes(value)
   ? f[key].filter(x=>x!==value) : [...f[key],value]}));

 return <>
  <PageHead title="Campaigns" subtitle="Outbox-backed sending with human cadence and account rotation"
   actions={<Link className="btn sm" href="/dashboard/campaigns/new"><Icon name="plus" size={15}/> New campaign</Link>}/>

  <div className="stat-grid luxe-stats">
   {[
    ['Active',stats.active,'#2563eb','campaigns live'],
    ['Queued',stats.queued,'#7c3aed','ready to send'],
    ['Sent',stats.sent,'#0f9d6e','across all campaigns'],
    ['Reply rate',`${stats.rate}%`,'#b58a3a','tracked replies']
   ].map(([label,value,color,note],i)=><div className="card stat-card" key={label}>
     <div className="stat-label">{label}</div><div className="stat" style={{color}}>{value}</div>
     <div className="muted" style={{fontSize:11}}>{note}</div>

   </div>)}
  </div>

  <div className="card luxe-card campaign-panel" style={{marginTop:16}}>
   <div className="campaign-toolbar">
    <div className="tabs">{['all','draft','queued','paused','completed'].map(t=><button key={t}
      className={filter===t?'active':''} onClick={()=>setFilter(t)}>{t}</button>)}</div>
    <div className="row">
     <div className="topbar-search"><Icon name="search" size={15}/>
      <input className="topbar-input" placeholder="Find a campaign" value={search} onChange={e=>setSearch(e.target.value)}/></div>
     <button className="btn ghost sm" onClick={load} title="Refresh"><Icon name="refresh" size={15}/></button>
    </div>
   </div>
   <table className="campaign-table"><thead><tr>
    <th>Campaign</th><th>Stream</th><th>Status</th><th>Progress</th><th>Cadence</th><th>Accounts</th><th>Actions</th>
   </tr></thead><tbody>
    {visible.map(c=>{ const total=(c.stats?.sent||0)+(c.stats?.queued||0);
     const pct=Math.min(100,(total ? Math.round(((c.stats?.sent||0)/total)*100) : 0));
     return <tr key={c._id}>
      <td><div className="campaign-name"><span className="campaign-icon"><Icon name="send" size={16}/></span>
        <div><Link href={`/dashboard/campaigns/${encodeURIComponent(c._id)}`}><b>{c.name}</b></Link><div className="muted mono">{c._id.slice(0,8)}</div></div></div></td>
      <td><span className="badge">{c.stream}</span></td>
      <td><span className={`badge ${statusTone(c.status)}`}>{c.status}</span></td>
      <td style={{minWidth:150}}><div className="progress"><i style={{width:`${pct}%`}}/></div>
       <div className="muted" style={{fontSize:10,marginTop:4}}>{c.stats?.sent||0} / {total} · {pct}%</div></td>
      <td><span className="muted">{cadence(c)}</span></td>
      <td>{(c.accountPool||[]).length || '—'}</td>
      <td><div className="row" style={{gap:6}}>
       {c.status==='draft'||c.status==='paused'
        ? <button className="btn secondary sm" onClick={()=>askLaunch(c)}><Icon name="bolt" size={14}/> Launch</button>
        : <button className="btn ghost sm" onClick={()=>pause(c)}>Pause</button>}
       <button className="btn ghost sm" onClick={()=>runPreflight(c)} title="Preflight"><Icon name="check" size={14}/></button>
       <button className="btn ghost sm" onClick={()=>{setTestTarget(c);setTestResult(null);setTestEmail('');}} title="Send test"><Icon name="mail" size={14}/></button>
       <Link className="btn ghost sm" href={`/dashboard/campaigns/${encodeURIComponent(c._id)}`} title="Details & tracking"><Icon name="chart" size={14}/></Link>
       <button className="btn ghost sm danger-text" onClick={()=>removeCampaign(c)} title="Delete campaign"><Icon name="close" size={14}/></button>
      </div></td>
     </tr>;})}
    {!visible.length&&<tr><td colSpan={7}><div className="empty">No campaigns match this view. Create one to get started.</div></td></tr>}
   </tbody></table>
   {msg&&<p className="muted">{msg}</p>}
  </div>

  {createOpen && <Modal title="New campaign" onClose={()=>setCreateOpen(false)}
   footer={<><button className="btn secondary" onClick={()=>setCreateOpen(false)}>Cancel</button>
    <button className="btn" onClick={create}>Create draft</button></>}>
   <div className="grid">
    <div><label>Campaign name</label><input style={{width:'100%'}} placeholder="Q4 product launch" value={form.name}
      onChange={e=>setForm({...form,name:e.target.value})}/></div>
    <div><label>Mail stream</label><select value={form.stream} onChange={e=>setForm({...form,stream:e.target.value})}>
     {['outreach','marketing','transactional'].map(x=><option key={x}>{x}</option>)}</select></div>
   </div>
   <div className="grid" style={{marginTop:14}}>
    <div><label>Template</label><select value={form.templateId} onChange={e=>setForm({...form,templateId:e.target.value})}>
     <option value="demo-template">Choose a template…</option>
     {templates.map(t=><option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
    <div><label>Account rotation</label><select value={form.rotation} onChange={e=>setForm({...form,rotation:e.target.value})}>
     {['sticky_by_contact','round_robin','weighted','least_used','random_jitter'].map(x=><option key={x}>{x}</option>)}</select></div>
   </div>
   <div className="divider"/>
   <div className="grid">
    <div><label className="stat-label">Audience lists</label>
     <div className="picker">{lists.length?lists.map(l=><label key={l._id} className="pick"><input type="checkbox"
       checked={form.listIds.includes(l._id)} onChange={()=>toggleIn('listIds',l._id)}/>{l.name||l._id}</label>)
      :<span className="muted">No lists yet</span>}</div></div>
    <div><label className="stat-label">Sending accounts</label>
     <div className="picker">{accounts.length?accounts.map(a=><label key={a._id} className="pick"><input type="checkbox"
       checked={form.accountPool.includes(a._id)} onChange={()=>toggleIn('accountPool',a._id)}/>{a.fromEmail||a._id}</label>)
      :<span className="muted">Connect an account first</span>}</div></div>
   </div>
   <div className="divider"/>
   <div className="grid3">
    <div><label>Min delay (sec)</label><input type="number" min={5} value={form.minDelaySec}
      onChange={e=>setForm({...form,minDelaySec:e.target.value})}/></div>
    <div><label>Max delay (sec)</label><input type="number" min={10} value={form.maxDelaySec}
      onChange={e=>setForm({...form,maxDelaySec:e.target.value})}/></div>
    <div><label>Daily cap / account</label><input type="number" min={1} value={form.dailyCap}
      onChange={e=>setForm({...form,dailyCap:e.target.value})}/></div>
   </div>
   <p className="muted" style={{marginTop:12,fontSize:12}}>At send time the campaign picks from your selected accounts using the rotation above. Human-like pacing is always on.</p>
  </Modal>}

  {launchTarget && <Modal title={`Launch “${launchTarget.name}”`} onClose={()=>setLaunchTarget(null)}
   footer={<><button className="btn secondary" onClick={()=>setLaunchTarget(null)}>Cancel</button>
    <button className="btn" onClick={confirmLaunch}>Confirm &amp; queue</button></>}>
   <p className="muted">Review before you send. Nothing is queued until you confirm.</p>
   <div className="confirm-grid" style={{marginTop:14}}>
    <div><div className="stat-label">Recipients</div><b>{launchInfo?.recipients ?? '…'}</b></div>
    <div><div className="stat-label">Accounts</div><b>{launchInfo?.accounts ?? (launchTarget.accountPool||[]).length}</b></div>
    <div><div className="stat-label">Batch size</div><b>{launchInfo?.batchSize ?? 'stream default'}</b></div>
    <div><div className="stat-label">Quota</div><b>{launchInfo?.quota?.ok===false?'Exceeded':'Available'}</b></div>
   </div>
   {launchInfo?.quota?.ok===false && <p className="notice" style={{marginTop:12}}>Upgrade or choose a smaller audience before launching.</p>}
  </Modal>}

  {preflight && <Modal title={`Preflight · ${preflight.campaign.name}`} onClose={()=>setPreflight(null)}
   footer={<button className="btn secondary" onClick={()=>setPreflight(null)}>Close</button>}>
   <div className={`notice ${preflight.result?.ok?'ok':''}`}>
    {preflight.result?.ok ? 'Ready to send. Tokens, unsubscribe link and subject line all passed.' : 'Review the items below before launching.'}
   </div>
   <pre className="code-block">{JSON.stringify(preflight.result?.issues || preflight.result || {}, null, 2)}</pre>
  </Modal>}

  {testTarget && <Modal title={`Send test · ${testTarget.name}`} onClose={()=>setTestTarget(null)}
   footer={<><button className="btn secondary" onClick={()=>setTestTarget(null)}>Close</button>
    <button className="btn" disabled={!/^\S+@\S+\.\S+$/.test(testEmail)} onClick={async()=>{
     try{ const r=await post(`/campaigns/${testTarget._id}/test-send`,{email:testEmail}); setTestResult(r); toast('Test sent and tracked'); }
     catch(e){ notify(toast, e); }
    }}><Icon name="send" size={14}/> Send test</button></>}>
   <p className="muted">Sends the campaign template through the connected account with live open/click tracking.</p>
   <label style={{marginTop:14}}>Recipient email</label>
   <input style={{width:'100%'}} type="email" placeholder="you@company.com" value={testEmail} onChange={e=>setTestEmail(e.target.value)}/>
   {testResult && <div className="notice ok" style={{marginTop:14}}>
    Sent to <b>{testResult.to}</b> from {testResult.account}<br/>
    <span className="muted">{testResult.subject} · id {testResult.messageId?.slice(0,12)}</span>
    <div style={{marginTop:8}}><Link className="btn ghost sm" href={`/dashboard/campaigns/${encodeURIComponent(testTarget._id)}`}>Open details & tracking</Link></div>
   </div>}
  </Modal>}
 </>;
}

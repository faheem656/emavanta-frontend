'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardBanner from '../../../components/DashboardBanner';
import Modal from '../../../components/Modal';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : [];

export default function Automation(){
 const toast = useToast();
 const [rows,setRows] = useState([]);
 const [templates,setTemplates] = useState([]);
 const [contacts,setContacts] = useState([]);
 const [enroll,setEnroll] = useState(null);
 const [selected,setSelected] = useState([]);
 const [filter,setFilter] = useState('all');
 const [busy,setBusy] = useState('');

 const load = () => {
  get('/sequences').then(r => setRows(arr(r)));
  get('/templates').then(r => setTemplates(arr(r)));
  get('/contacts').then(r => setContacts(arr(r)));
 };
 useEffect(() => { load(); }, []);

 const toggle = async s => {
  const status = s.status === 'active' ? 'paused' : 'active';
  setBusy(s._id);
  try { await patch(`/sequences/${s._id}`,{status}); toast(`Automation ${status}`); load(); }
  catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const remove = async s => {
  if(!window.confirm(`Delete “${s.name}”? Contacts already inside keep their history, but the flow stops.`))return;
  try { await del(`/sequences/${s._id}`); toast('Automation deleted'); load(); } catch(e){ notify(toast,e); }
 };
 const duplicate = async s => {
  try { await post(`/sequences/${s._id}/duplicate`,{}); toast('Duplicated as a paused copy'); load(); }
  catch(e){ notify(toast,e); }
 };
 const saveEnroll = async () => {
  try { const r = await post(`/sequences/${enroll._id}/enroll`,{contactIds:selected});
   toast(`${r.enrolled} contact(s) enrolled`); setEnroll(null); setSelected([]); load();
  } catch(e){ notify(toast,e); }
 };

 const visible = filter === 'all' ? rows : rows.filter(r => (r.status||'active') === filter);
 const counts = { all:rows.length, active:rows.filter(r=>r.status==='active').length, paused:rows.filter(r=>r.status==='paused').length, draft:rows.filter(r=>r.status==='draft').length };

 return <>
  <PageHead title="Automations" subtitle="Design and organize workflow drafts"
   actions={<><Link className="btn secondary sm" href="/dashboard/templates"><Icon name="mail" size={15}/> Templates</Link>
    <Link className="btn sm" href="/dashboard/automation/new"><Icon name="plus" size={15}/> New automation</Link></>}/>

  <DashboardBanner variant="automation"/>

  <div className="notice" style={{marginBottom:16}}><b>Execution unavailable.</b> Workflow drafts can be designed, but triggers and email steps do not run yet. Activation and enrollment are disabled; review any existing active workflows.</div>
  <div className="row" style={{marginBottom:14}}>
   <div className="segmented">
    {[['all','All'],['draft','Draft'],['active','Active (legacy)'],['paused','Paused']].map(([k,label])=>
     <button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{label} <span className="muted">{counts[k]}</span></button>)}
   </div>
  </div>

  {!rows.length && <div className="card luxe-card">
   <div className="empty" style={{padding:'34px 10px',textAlign:'center'}}>
    <img src="/emavanta-logo.webp" alt="Emavanta" style={{height:34,margin:'0 auto 14px',display:'block'}}/>
    <b>No automations yet</b>
    <p className="muted">Build a welcome series, a follow-up chain, or a re-engagement flow in the visual editor.</p>
    <Link className="btn sm" href="/dashboard/automation/new" style={{marginTop:10}}><Icon name="plus" size={14}/> Create your first automation</Link>
   </div>
  </div>}

  <div className="automation-grid">
   {visible.map(s=><div className="card luxe-card automation-card" key={s._id}>
    <div className="mini-row">
     <div><Link href={`/dashboard/automation/${s._id}`} style={{color:'inherit'}}><h2 style={{margin:0}}>{s.name}</h2></Link>
      <span className="muted">{s.stepCount||(s.steps||[]).length} steps · trigger: {(s.trigger||'manual').replace(/_/g,' ')}</span></div>
     <span className={`badge ${s.status==='active'?'ok':'warn'}`}>{s.status||'active'}</span>
    </div>
    {s.description && <p className="muted" style={{fontSize:12.5,marginTop:6}}>{s.description}</p>}
    <div className="flow">
     {(s.steps||[]).slice(0,5).map((st,i)=><div key={i} className="flow-step">
      <span className="avatar">{i+1}</span><span className="badge">{st.type}</span>
      <span className="muted">{st.type==='email'?(templates.find(t=>t._id===st.templateId)?.name||'Template'):
        st.type==='delay'?`Wait ${st.delayMinutes>=1440?`${st.delayMinutes/1440}d`:`${st.delayMinutes||60}m`}`:(st.condition||'condition')}</span>
     </div>)}
     {(s.steps||[]).length>5 && <div className="muted">+{s.steps.length-5} more steps</div>}
    </div>
    <div className="row" style={{marginTop:14,flexWrap:'wrap'}}>
     <Link className="btn secondary sm" href={`/dashboard/automation/${s._id}`}>Edit flow</Link>
     <button className="btn ghost sm" onClick={()=>toggle(s)} disabled={busy===s._id || s.status!=='active'}>{s.status==='active'?'Pause':'Activation unavailable'}</button>
     <button className="btn ghost sm" disabled title="Workflow execution is not available yet">Enroll unavailable</button>
     <button className="btn ghost sm" onClick={()=>duplicate(s)} title="Duplicate"><Icon name="download" size={13}/></button>
     <button className="btn ghost sm danger-text" onClick={()=>remove(s)} title="Delete"><Icon name="close" size={13}/></button>
    </div>
   </div>)}
  </div>

  <div className="grid" style={{marginTop:16}}>
   <div className="card luxe-card"><h3>Draft workflows</h3><p className="muted">Create and organize email and wait steps for future use. Execution is not available yet.</p></div>
   <div className="card luxe-card"><h3>Before activation</h3><p className="muted">Sending, conditions and triggers require a working execution engine before activation can be enabled.</p></div>
  </div>

  {enroll && <Modal title={`Enroll contacts · ${enroll.name}`} onClose={()=>setEnroll(null)}
   footer={<><button className="btn secondary" onClick={()=>setEnroll(null)}>Cancel</button>
    <button className="btn" onClick={saveEnroll} disabled={!selected.length}>Enroll {selected.length||''}</button></>}>
   <p className="muted">Contacts start at step 1 and follow the same pacing rules as campaigns.</p>
   <div className="row" style={{marginTop:8}}>
    <button className="btn ghost sm" onClick={()=>setSelected(contacts.map(c=>c._id))}>Select all</button>
    <button className="btn ghost sm" onClick={()=>setSelected([])}>Clear</button>
   </div>
   <div className="picker" style={{marginTop:12,maxHeight:320}}>
    {contacts.map(c=><label key={c._id} className="pick"><input type="checkbox"
     checked={selected.includes(c._id)} onChange={()=>setSelected(v=>v.includes(c._id)?v.filter(x=>x!==c._id):[...v,c._id])}/>
     {c.firstName||c.email.split('@')[0]} <span className="muted">· {c.email}</span></label>)}
    {!contacts.length&&<span className="muted">Add contacts first.</span>}
   </div>
  </Modal>}
 </>;
}

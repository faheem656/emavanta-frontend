'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Modal from '../../../components/Modal';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';
import { ListSkeleton } from '../../../components/DashboardSkeleton';

const arr = value => Array.isArray(value) ? value : [];
const humanize = value => String(value || 'manual').replace(/_/g, ' ').replace(/^\w/, character => character.toUpperCase());
const waitLabel = minutes => {
 const value = Math.max(1, Number(minutes) || 60);
 if (value % 1440 === 0) return `Wait ${value / 1440}d`;
 if (value % 60 === 0) return `Wait ${value / 60}h`;
 return `Wait ${value}m`;
};

export default function Automation(){
 const toast = useToast();
 const [rows,setRows] = useState([]);
 const [templates,setTemplates] = useState([]);
 const [contacts,setContacts] = useState([]);
 const [enroll,setEnroll] = useState(null);
 const [selected,setSelected] = useState([]);
 const [filter,setFilter] = useState('all');
 const [query,setQuery] = useState('');
 const [busy,setBusy] = useState('');
 const [loading,setLoading] = useState(true);

 const load = async () => {
  const results = await Promise.allSettled([get('/sequences'), get('/templates'), get('/contacts')]);
  if (results[0].status === 'fulfilled') setRows(arr(results[0].value));
  if (results[1].status === 'fulfilled') setTemplates(arr(results[1].value));
  if (results[2].status === 'fulfilled') setContacts(arr(results[2].value?.items || results[2].value));
  setLoading(false);
 };
 useEffect(() => { void load(); }, []);

 const toggle = async sequence => {
  const status = sequence.status === 'active' ? 'paused' : 'active';
  if(status==='active'&&!window.confirm('Activating starts real emails for new matching contacts. Existing contacts are not backfilled, and each contact enters only once. Confirm the workflow, consent, mailbox and send limits. Continue?'))return;
  setBusy(sequence._id);
  try { await patch(`/sequences/${sequence._id}`,{status,...(status==='active'?{confirmActivation:true}:{})}); toast(`Automation ${status}`); await load(); }
  catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const remove = async sequence => {
  if(!window.confirm(`Delete “${sequence.name}”? Contacts already inside keep their history, but the flow stops.`))return;
  setBusy(sequence._id);
  try { await del(`/sequences/${sequence._id}`); toast('Automation deleted'); await load(); }
  catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const duplicate = async sequence => {
  setBusy(sequence._id);
  try { await post(`/sequences/${sequence._id}/duplicate`,{}); toast('Duplicated as a paused copy'); await load(); }
  catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const saveEnroll = async () => {
  if (!enroll || !selected.length) return;
  try { const result = await post(`/sequences/${enroll._id}/enroll`,{contactIds:selected});
   toast(`${result.queued} queued · ${Math.max(0,(result.accepted||0)-(result.queued||0))} already enrolled or skipped`); setEnroll(null); setSelected([]); await load();
  } catch(e){ notify(toast,e); }
 };

 const counts = useMemo(() => ({
  all:rows.length,
  active:rows.filter(row=>row.status==='active').length,
  paused:rows.filter(row=>row.status==='paused').length,
  draft:rows.filter(row=>!row.status||row.status==='draft').length
 }),[rows]);
 const visible = useMemo(() => rows.filter(sequence => {
  const status = sequence.status || 'draft';
  const statusMatch = filter === 'all' || status === filter;
  const haystack = `${sequence.name||''} ${sequence.description||''} ${sequence.trigger||''} ${sequence.triggerTag||''}`.toLowerCase();
  return statusMatch && haystack.includes(query.trim().toLowerCase());
 }),[rows,filter,query]);
 const templateName = id => templates.find(template=>template._id===id)?.name || 'Email step';
 const triggerText = sequence => {
  const trigger = humanize(sequence.trigger || 'manual');
  if (sequence.triggerTag) return `${trigger} · ${sequence.triggerTag}`;
  if (sequence.formId) return `${trigger} · form linked`;
  if (sequence.listId) return `${trigger} · list linked`;
  return trigger;
 };
 const stepText = step => step.type === 'email' ? templateName(step.templateId)
  : step.type === 'delay' ? waitLabel(step.delayMinutes)
  : step.condition || 'Condition';
 const shortStepText = step => step.type === 'email'
  ? templateName(step.templateId).split(/\s+[·—–|]/)[0]
  : stepText(step);

 return <>
  <PageHead title="Automations" subtitle="Review every workflow, its trigger and next steps in one clear list."
   actions={<><Link className="btn secondary sm" href="/dashboard/templates"><Icon name="mail" size={15}/> Templates</Link>
    <Link className="btn sm" href="/dashboard/automation/new"><Icon name="plus" size={15}/> New automation</Link></>}/>

  <div className="notice automation-list-note"><b>Live automations run for future triggers.</b> Check the audience’s consent, sender, mailbox and limits before activation. Existing contacts are not backfilled.</div>

  <div className="automation-toolbar">
   <div className="segmented" aria-label="Filter automations">
    {[['all','All'],['draft','Draft'],['active','Active'],['paused','Paused']].map(([key,label])=>
     <button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label} <span className="muted">{counts[key]}</span></button>)}
   </div>
   <label className="automation-search"><Icon name="search" size={15}/><input aria-label="Search automations" placeholder="Search workflows…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
  </div>

  {loading ? <ListSkeleton count={6}/> : rows.length === 0 ? <div className="card luxe-card automation-list-empty">
   <span className="automation-empty-icon"><Icon name="refresh" size={19}/></span>
   <b>No automations yet</b>
   <p className="muted">Create a welcome series, follow-up, or re-engagement workflow. Drafts stay paused until you review and activate them.</p>
   <Link className="btn sm" href="/dashboard/automation/new"><Icon name="plus" size={14}/> Create your first automation</Link>
  </div> : visible.length === 0 ? <div className="card luxe-card automation-list-empty">
   <b>No workflows match this filter</b><p className="muted">Try a different status or search term.</p>
  </div> : <div className="automation-list" role="table" aria-label="Automation workflows">
   <div className="automation-list-head" role="row">
    <span role="columnheader">Workflow</span><span role="columnheader">Journey</span><span role="columnheader">Status</span><span role="columnheader">Actions</span>
   </div>
   {visible.map(sequence=>{
    const steps = arr(sequence.steps);
    const status = sequence.status || 'draft';
    return <article className="automation-list-row" role="row" key={sequence._id}>
     <div className="automation-list-cell automation-list-main" role="cell">
      <span className="automation-list-icon"><Icon name="refresh" size={15}/></span>
      <div className="automation-list-copy">
       <Link className="automation-list-title" href={`/dashboard/automation/${sequence._id}`}>{sequence.name || 'Untitled workflow'}</Link>
       {sequence.description && <span className="automation-list-desc">{sequence.description}</span>}
       <span className="automation-list-trigger" title={triggerText(sequence)}><Icon name="bolt" size={11}/><span>{triggerText(sequence)}</span></span>
      </div>
     </div>
     <div className="automation-list-cell" role="cell">
      <span className="workflow-cell-label">Journey · {steps.length} step{steps.length===1?'':'s'}</span>
      {steps.length ? <div className="automation-list-steps">
       {steps.slice(0,3).map((step,index)=><span className="automation-list-step-group" key={`${step.type}-${index}`}>
        <span className="automation-list-step" title={`${step.type}: ${stepText(step)}`}><i>{index+1}</i><b>{shortStepText(step)}</b></span>
        {index < Math.min(steps.length,3)-1 && <Icon className="automation-list-step-arrow" name="chevron" size={12}/>}
       </span>)}
       {steps.length>3 && <span className="automation-list-more">+{steps.length-3}</span>}
      </div> : <span className="automation-list-empty-steps">No steps yet</span>}
     </div>
     <div className="automation-list-cell" role="cell">
      <span className="workflow-cell-label">Status</span>
      <div className="automation-list-status"><span className={`badge ${status==='active'?'ok':status==='paused'?'warn':''}`}>{status}</span></div>
      <span className="automation-list-count">{steps.length} step{steps.length===1?'':'s'} · created {sequence.createdAt && Number.isFinite(Date.parse(sequence.createdAt)) ? new Date(sequence.createdAt).toLocaleDateString() : '—'}</span>
     </div>
     <div className="automation-list-cell automation-list-action-cell" role="cell">
      <span className="workflow-cell-label">Actions</span>
      <div className="automation-list-actions">
       <Link className="btn secondary sm" href={`/dashboard/automation/${sequence._id}`}>Edit flow</Link>
       <button className={`btn ${status==='active'?'ghost':'secondary'} sm`} onClick={()=>toggle(sequence)} disabled={busy===sequence._id}>
        {busy===sequence._id?'Working…':status==='active'?'Pause':'Review & activate'}
       </button>
       {status==='active'&&sequence.trigger==='manual'
        ? <button className="btn ghost sm" onClick={()=>{setEnroll(sequence);setSelected([]);}}>Enroll</button>
        : <button className="btn ghost sm" disabled title={status!=='active'?'Activate this workflow first':`Trigger: ${sequence.trigger||'manual'}`}>Enroll</button>}
       <button className="icon-btn sm" title="Duplicate workflow" aria-label={`Duplicate ${sequence.name}`} onClick={()=>duplicate(sequence)} disabled={busy===sequence._id}><Icon name="copy" size={13}/></button>
       <button className="icon-btn sm danger-text" title="Delete workflow" aria-label={`Delete ${sequence.name}`} onClick={()=>remove(sequence)} disabled={busy===sequence._id}><Icon name="close" size={13}/></button>
      </div>
     </div>
    </article>;
   })}
  </div>}

  {enroll && <Modal title={`Enroll contacts · ${enroll.name}`} onClose={()=>setEnroll(null)}
   footer={<><button className="btn secondary" onClick={()=>setEnroll(null)}>Cancel</button>
    <button className="btn" onClick={saveEnroll} disabled={!selected.length}>Enroll {selected.length||''}</button></>}>
   <p className="muted">Selected contacts start at step 1 once. Suppressed or unsubscribed addresses are not sent to.</p>
   <div className="row" style={{marginTop:8}}>
    <button className="btn ghost sm" onClick={()=>setSelected(contacts.map(contact=>contact._id))}>Select all</button>
    <button className="btn ghost sm" onClick={()=>setSelected([])}>Clear</button>
   </div>
   <div className="picker" style={{marginTop:12,maxHeight:320}}>
    {contacts.map(contact=><label key={contact._id} className="pick"><input type="checkbox"
     checked={selected.includes(contact._id)} onChange={()=>setSelected(value=>value.includes(contact._id)?value.filter(id=>id!==contact._id):[...value,contact._id])}/>
     {contact.firstName||contact.email?.split('@')[0]||'Contact'} <span className="muted">· {contact.email}</span></label>)}
    {!contacts.length&&<span className="muted">Add contacts first.</span>}
   </div>
  </Modal>}
 </>;
}

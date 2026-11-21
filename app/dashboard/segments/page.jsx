'use client';
import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const FIELDS = [
  { value:'email', label:'Email' }, { value:'company', label:'Company' },
  { value:'city', label:'City' }, { value:'country', label:'Country' },
  { value:'title', label:'Job title' }, { value:'plan', label:'Plan' }
];
const OPS = [
  { value:'contains', label:'contains' }, { value:'equals', label:'is exactly' },
  { value:'exists', label:'has any value' }
];

export default function Segments(){
 const toast = useToast();
 const [items,setItems] = useState([]);
 const [name,setName] = useState('');
 const [filters,setFilters] = useState([{ field:'company', op:'contains', value:'' }]);
 const [preview,setPreview] = useState(null);
 const [editing,setEditing] = useState(null);
 const [busy,setBusy] = useState('');

 const load = () => get('/segments').then(r => setItems(arr(r))).catch(e => notify(toast, e));
 useEffect(() => { load(); }, []);
 useEffect(() => {
  const t = setTimeout(() => {
   post('/segments/draft/preview',{ filters }).then(setPreview).catch(()=>{});
  }, 400);
  return () => clearTimeout(t);
 }, [filters]);

 const setFilter = (i, key, value) => setFilters(f => f.map((x, j) => j === i ? { ...x, [key]:value } : x));
 const save = async () => {
  if(name.trim().length < 2){ toast('Name this segment first','warn'); return; }
  setBusy('save');
  try {
   if(editing) { await patch(`/segments/${editing}`,{ name, filters }); toast('Segment updated'); }
   else { await post('/segments',{ name, filters }); toast('Segment saved — it stays in sync as contacts change'); }
   setName(''); setFilters([{ field:'company', op:'contains', value:'' }]); setEditing(null); load();
  } catch(e){ notify(toast, e); } finally{ setBusy(''); }
 };
 const edit = s => { setEditing(s._id); setName(s.name); setFilters(s.filters?.length ? s.filters : [{ field:'company', op:'contains', value:'' }]); window.scrollTo({ top:0, behavior:'smooth' }); };
 const remove = async s => {
  if(!window.confirm(`Delete segment “${s.name}”?`))return;
  try { await del(`/segments/${s._id}`); toast('Segment deleted'); load(); } catch(e){ notify(toast, e); }
 };

 return <>
  <PageHead title="Segments" subtitle="Saved conditions that always reflect your live contact data"
   actions={<button className="btn sm" onClick={save} disabled={busy==='save'}>{busy==='save'?'Saving…':editing?'Update segment':'Save segment'}</button>}/>

  <div className="notice" style={{ marginBottom:14 }}>
   <b>What is a segment?</b> A saved rule like “company contains agency” or “city is exactly Vilnius”.
   Unlike a list you manage by hand, a segment recalculates itself — add a matching contact and they are in it automatically.
   Lists are for who you uploaded; segments are for who matches a condition right now.
  </div>

  <div className="grid" style={{ gridTemplateColumns:'1.4fr 1fr', alignItems:'start' }}>
   <div className="card luxe-card">
    <div className="mini-row"><h2 style={{ margin:0 }}>{editing?'Edit segment':'New segment'}</h2>
      {editing && <button className="btn ghost sm" onClick={()=>{setEditing(null);setName('');setFilters([{field:'company',op:'contains',value:''}]);}}>Cancel edit</button>}</div>
    <label style={{ marginTop:12 }}>Segment name</label>
    <input style={{ width:'100%' }} value={name} onChange={e=>setName(e.target.value)} placeholder="Agencies in Europe"/>

    <h3 style={{ marginTop:18 }}>Show contacts where <span className="muted" style={{ fontWeight:400 }}>(all conditions match)</span></h3>
    {filters.map((f,i)=><div className="seg-row" key={i}>
      <select value={f.field} onChange={e=>setFilter(i,'field',e.target.value)}>
        {FIELDS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
      <select value={f.op} onChange={e=>setFilter(i,'op',e.target.value)}>
        {OPS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
      <input value={f.value} disabled={f.op==='exists'} onChange={e=>setFilter(i,'value',e.target.value)} placeholder="value"/>
      <button className="icon-btn sm" onClick={()=>setFilters(filters.filter((_,j)=>j!==i))} title="Remove"><Icon name="close" size={12}/></button>
    </div>)}
    <button className="btn ghost sm" style={{ marginTop:8 }} onClick={()=>setFilters([...filters,{ field:'city', op:'contains', value:'' }])}>
      <Icon name="plus" size={14}/> Add condition</button>
   </div>

   <div className="card luxe-card">
    <div className="mini-row"><h2 style={{ margin:0 }}>Live preview</h2><span className="badge">{preview?.count ?? 0} match</span></div>
    <p className="muted" style={{ fontSize:12.5 }}>Updates as you type — this is the exact audience a campaign would use.</p>
    <div className="seg-sample">
      {(preview?.sample||[]).map(e=><div className="seg-sample-row" key={e}><span className="avatar">{e[0].toUpperCase()}</span>{e}</div>)}
      {!preview?.sample?.length && <div className="empty">No contacts match yet</div>}
    </div>
   </div>
  </div>

  <div className="card luxe-card" style={{ marginTop:16 }}>
   <div className="mini-row"><h2 style={{ margin:0 }}>Saved segments</h2><span className="badge">{items.length}</span></div>
   {items.length ? <div className="seg-grid">
    {items.map(s=><div className="seg-card" key={s._id}>
      <div className="mini-row"><b>{s.name}</b><span className="badge">{s.filters?.length||0} rule(s)</span></div>
      <div className="muted" style={{ fontSize:12 }}>{(s.filters||[]).map(f=>`${f.field} ${f.op} ${f.value||''}`).join(' · ')||'no conditions'}</div>
      <div className="row" style={{ marginTop:10 }}>
       <button className="btn ghost sm" onClick={()=>edit(s)}>Edit</button>
       <button className="btn ghost sm" onClick={()=>post(`/segments/${s._id}/preview`,{}).then(r=>toast(`${r.count} contacts match`)).catch(e=>notify(toast,e))}>Preview</button>
       <button className="btn ghost sm danger-text" onClick={()=>remove(s)}>Delete</button>
      </div>
    </div>)}
   </div> : <div className="empty">No segments yet — build one on the left.</div>}
  </div>
 </>;
}

'use client';
import { useEffect, useState } from 'react';
import { get, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';
export default function Consent(){
 const toast=useToast(); const [items,setItems]=useState([]),[form,setForm]=useState({email:'',source:'website-form',textVersion:'v1'});
 const [loaded,setLoaded]=useState(false);
 const load=()=>get('/consent').then(setItems).catch(()=>{}).finally(()=>setLoaded(true)); useEffect(() => { load(); }, []);
 const add=async()=>{try{await post('/consent',form);toast('Consent recorded');load();}catch(e){notify(toast, e);}};
 if (!loaded) return <DashboardSkeleton variant="table" rows={5} columns={5} />;
 return <>
  <PageHead title="Consent evidence" subtitle="Who opted in, when, from where, and under which text version"/>
  <div className="card"><div className="row"><input placeholder="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
   <select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>{['website-form','import','manual','double-optin','api'].map(x=><option key={x}>{x}</option>)}</select>
   <input placeholder="text version" value={form.textVersion} onChange={e=>setForm({...form,textVersion:e.target.value})}/>
   <button className="btn sm" onClick={add}><Icon name="plus" size={15}/> Record</button></div></div>
  <div className="card table-card"><table><thead><tr><th>Email</th><th>Source</th><th>Version</th><th>Evidence hash</th><th>When</th></tr></thead><tbody>
   {items.map(c=><tr key={c._id}><td>{c.email}</td><td><span className="badge">{c.source}</span></td><td>{c.textVersion||'—'}</td>
    <td><code>{String(c.evidenceHash||'').slice(0,12)}</code></td><td className="muted">{c.createdAt?.slice(0,10)}</td></tr>)}
   {!items.length&&<tr><td colSpan={5} className="empty">No consent records yet</td></tr>}
  </tbody></table></div>
 </>;
}

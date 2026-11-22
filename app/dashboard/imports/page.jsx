'use client';
import { useEffect, useState } from 'react';
import { get, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

export default function Imports(){
 const toast=useToast();
 const [csv,setCsv]=useState('email,first_name,company\nalice@example.com,Alice,Acme\n');
 const [lists,setLists]=useState([]);
 useEffect(()=>{get('/contacts/lists').then(r=>setLists(Array.isArray(r)?r:[])).catch(e=>notify(toast,e));},[]);
 const [listId,setListId]=useState(''),[batch,setBatch]=useState(null),[result,setResult]=useState(null);
 const stage=async()=>{try{const r=await post('/imports/csv',{csv,listIds:listId?[listId]:[]});setBatch(r);setResult(null);toast('Staged '+r.accepted+' rows');}catch(e){notify(toast, e);}};
 const commit=async()=>{try{setResult(await post(`/imports/${batch.batchId}/commit`,{}));toast('Import committed');}catch(e){notify(toast, e);}};
 return <>
  <PageHead title="CSV import" subtitle="Stage a CSV, then save contacts and add existing contacts to your chosen list"/>
  <div className="card"><h2>Paste CSV</h2>
   <textarea rows="10" style={{width:'100%',fontFamily:'monospace'}} value={csv} onChange={e=>setCsv(e.target.value)}/>
   <div className="row" style={{marginTop:12}}><select aria-label="Destination list" value={listId} onChange={e=>setListId(e.target.value)}><option value="">No list</option>{lists.map(l=><option key={l._id} value={l._id}>{l.name}</option>)}</select>
    <button className="btn sm" onClick={stage}>Stage import</button></div>
  </div>
  {batch&&<div className="card"><h2>Staged batch</h2><div className="grid">
   <div><div className="stat-label">Rows</div><div className="stat">{batch.total}</div></div>
   <div><div className="stat-label">Accepted</div><div className="stat">{batch.accepted}</div></div>
   <div><div className="stat-label">Rejected</div><div className="stat">{batch.rejected}</div></div>
  </div><div className="row" style={{marginTop:12}}><button className="btn" onClick={commit}>Commit contacts</button>
   <button className="btn ghost" disabled={!!result} onClick={async()=>{try{await post(`/imports/${batch.batchId}/rollback`,{});setBatch(null);toast('Staged batch discarded');}catch(e){notify(toast,e);}}}>Discard staged batch</button></div>
   {result&&<p className="muted" style={{marginTop:12}}>Created {result.created} · existing rows {result.duplicates} · existing contacts added to lists {result.addedToLists || 0}</p>}
  </div>}
 </>;
}

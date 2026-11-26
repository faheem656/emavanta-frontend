'use client';
import { useEffect, useState } from 'react';
import { get, post, patch } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
const COLS=['new','qualified','proposal','won'];
export default function CRM(){
 const toast=useToast(); const [deals,setDeals]=useState([]),[title,setTitle]=useState('');
 const [loaded,setLoaded]=useState(false);
 const load=()=>get('/crm/deals').then(setDeals).catch(()=>{}).finally(()=>setLoaded(true)); useEffect(() => { load(); }, []);
 const add=async()=>{if(!title)return;await post('/crm/deals',{name:title});setTitle('');toast('Deal created');load();};
 const move=async(d,dir)=>{const i=COLS.indexOf(d.stage||'new');const next=COLS[Math.min(COLS.length-1,Math.max(0,i+dir))];
  await patch(`/crm/deals/${d._id}`,{stage:next});load();};
 if (!loaded) return <DashboardSkeleton variant="cards" />;
 return <>
  <PageHead title="CRM" subtitle="Deals, tasks and pipeline" actions={<div className="row"><input placeholder="New deal" value={title} onChange={e=>setTitle(e.target.value)}/>
   <button className="btn sm" onClick={add}><Icon name="plus" size={15}/> Add</button></div>}/>
  <div className="kanban">{COLS.map(col=><div className="kanban-col" key={col}>
   <div className="mini-row"><b style={{textTransform:'capitalize'}}>{col}</b><span className="badge">{deals.filter(d=>(d.stage||'new')===col).length}</span></div>
   {deals.filter(d=>(d.stage||'new')===col).map(d=><div className="kanban-card" key={d._id}>
     <b>{d.name}</b><div className="muted">${d.value||0}</div>
     <div className="row" style={{marginTop:8}}><button className="btn ghost sm" onClick={()=>move(d,-1)}>←</button>
      <button className="btn ghost sm" onClick={()=>move(d,1)}>→</button></div>
   </div>)}
  </div>)}</div>
 </>;
}

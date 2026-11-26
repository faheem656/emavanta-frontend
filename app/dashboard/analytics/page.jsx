'use client';
import { useEffect, useState } from 'react';
import { get } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import { Bars, Donut, Sparkline } from '../../../components/Charts';
export default function Analytics(){
 const [s,setS]=useState(null),[byAccount,setByAccount]=useState({});
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{Promise.allSettled([
  get('/analytics/overview').then(setS),
  get('/analytics/by-account').then(setByAccount)
 ]).then(()=>setLoaded(true));},[]);
 if(!loaded) return <DashboardSkeleton variant="overview" />;
 return <>
  <PageHead title="Analytics" subtitle="One metric dictionary. Opens are secondary, not proof."/>
  <div className="grid" style={{gridTemplateColumns:'1.4fr 1fr'}}>
   <div className="card" style={{padding:20}}><h2>Delivery over time</h2>
    <Bars data={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l,i)=>({label:l,value:[42,55,61,48,72,33,59][i]}))}/></div>
   <div className="card" style={{padding:20,textAlign:'center'}}><h2 style={{textAlign:'left'}}>Event mix</h2>
    <Donut segments={[{value:s?.stats?.sent||0,color:'#2563eb'},{value:s?.stats?.delivered||0,color:'#0f9d6e'},
      {value:s?.stats?.bounced||0,color:'#d64550'}]}/></div>
  </div>
  <div className="card table-card" style={{marginTop:16}}><h2 style={{padding:'18px 18px 0'}}>By sending account</h2>
   <table><thead><tr><th>Account</th><th>Sent</th><th>Share</th><th>Trend</th></tr></thead><tbody>
    {Object.entries(byAccount).map(([id,v])=><tr key={id}><td>{id.slice(0,12)}</td><td>{v.sent}</td>
      <td style={{width:200}}><div className="progress"><i style={{width:`${Math.min(100,v.sent*2)}%`}}/></div></td>
      <td style={{width:120}}><Sparkline values={[2,5,3,7,6,9,v.sent]}/></td></tr>)}
    {!Object.keys(byAccount).length&&<tr><td colSpan={4} className="empty">No messages yet</td></tr>}
   </tbody></table></div>
 </>;
}

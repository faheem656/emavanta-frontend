'use client';
import { useEffect, useState } from 'react';
import AccountConnector from '../../../components/AccountConnector';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
export default function Accounts(){
 const [health,setHealth]=useState(null);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{import('../../../lib/api').then(m=>m.get('/deliverability/health').then(setHealth).catch(()=>{})).finally(()=>setLoaded(true));},[]);
 if(!loaded) return <DashboardSkeleton variant="cards" />;
 return <><PageHead title="Mail accounts" subtitle="Connect through SMTP or ESP API — every mailbox must pass a live event-tracking test (Webhook · IMAP · POP3 · Mail API) before it is added"
  actions={<span className="badge ok">{health?.accounts||'—'} active</span>}/>
  <AccountConnector/>
  <div className="card"><h2>Deliverability instruments</h2>
   <div className="grid">{['DNS authentication','Warmup ramp','Bounce classification','Complaint threshold','Suppression','Seed tests'].map(x=>
    <div className="block" key={x}><Icon name="shield" size={15}/> {x}</div>)}</div>
  </div></>;
}

'use client';
import { useEffect, useState } from 'react';
import AccountConnector from '../../../components/AccountConnector';
import PageHead from '../../../components/PageHead';
import Icon from '../../../components/Icon';
export default function Accounts(){
 const [health,setHealth]=useState(null);
 useEffect(()=>{import('../../../lib/api').then(m=>m.get('/deliverability/health').then(setHealth).catch(()=>{}));},[]);
 return <><PageHead title="Mail accounts" subtitle="Your accounts, your reputation — connected through OAuth, SMTP or ESP API"
  actions={<span className="badge ok">{health?.accounts||'—'} active</span>}/>
  <AccountConnector/>
  <div className="card"><h2>Deliverability instruments</h2>
   <div className="grid">{['DNS authentication','Warmup ramp','Bounce classification','Complaint threshold','Suppression','Seed tests'].map(x=>
    <div className="block" key={x}><Icon name="shield" size={15}/> {x}</div>)}</div>
  </div></>;
}

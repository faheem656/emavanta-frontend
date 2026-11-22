'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, health, REQUIRED_API_SCHEMA } from '../../../lib/api';
import ConnectionStatus from '../../../components/ConnectionStatus';
export default function Status(){
 const [h,setH]=useState(null);
 const [probe,setProbe]=useState(null);
 const [via,setVia]=useState(null);
 const check=async()=>{
  const direct = await health();
  setProbe(direct);
  setH(await get('/health'));
  try {
   const t0 = performance.now();
   const res = await fetch('/api/v1/health',{cache:'no-store'});
   setVia({ status:res.status, ms:Math.round(performance.now()-t0) });
  } catch { setVia({ status:0, ms:0 }); }
 };
 useEffect(()=>{ check(); },[]);
 return <>
  <ConnectionStatus/>
  <section className="hero2 container"><div className={`badge ${probe?.ok?'ok':'warn'}`}>{probe?.ok?'API reachable':'Backend not reachable'}</div>
   <h1 style={{fontSize:46}}>System status &amp; diagnostics</h1>
   <p className="lead">Live checks of the exact path your dashboard uses, plus the fixes for the usual local setup problems.</p></section>
  <section className="section container" style={{paddingTop:10}}>
   <div className="card2" style={{maxWidth:860,margin:'0 auto'}}>
    <div className="mini-row"><h3 style={{margin:0}}>Connection diagnostics</h3>
     <button className="btn ghost sm" onClick={check}>Re-run checks</button></div>
    <div className="diag-grid">
     <div className="diag-row"><span>API via dashboard proxy <code>/api/v1/health</code></span>
      <span className={`badge ${probe?.ok?'ok':'danger'}`}>{probe?.ok?'200 OK':'unreachable'}</span></div>
     <div className="diag-row"><span>Proxy round-trip</span>
      <span className="muted">{via?.status?`${via.status} in ${via.ms} ms`:'no response'}</span></div>
     <div className="diag-row"><span>Service mode</span><span className="muted">{probe?.mode||h?.mode||'—'}</span></div>
     <div className="diag-row"><span>API schema</span>
      <span className="muted">{probe?.schema ?? 0} {Number(probe?.schema||0) < REQUIRED_API_SCHEMA ? `· older than this dashboard (needs ${REQUIRED_API_SCHEMA}) — restart the API` : '· up to date'}</span></div>
     <div className="diag-row"><span>Data storage</span>
      <span className="muted">{probe?.storage === 'mongo'
        ? `MongoDB · ${probe?.db?.database || 'database'} · ${probe?.db?.connected ? 'connected' : 'not connected'}${probe?.db?.host ? ` · ${probe.db.host}` : ''}`
        : 'in-memory (data resets on restart)'}</span></div>
     <div className="diag-row"><span>API uptime</span><span className="muted">{probe?.uptime?`${Math.round(probe.uptime)}s`:'—'}</span></div>
    </div>
    {!probe?.ok && <div className="notice warn" style={{marginTop:12}}>
     <b>The service is unavailable.</b> Retry shortly or contact support if the issue continues.
    </div>}
   </div>
  </section>
  <section className="section container" style={{paddingTop:10}}>
   <div className="card2" style={{maxWidth:760,margin:'0 auto'}}>
    <div className="mini-row" style={{justifyContent:'space-between'}}>
      <h3 style={{margin:0}}>Overall <span className={`badge ${h?.ok?'ok':'warn'}`}>{h?.ok?'API reachable':'API not reachable'}</span></h3>
      <span className="muted">{h?.now?new Date(h.now).toLocaleString():'checking now'}</span>
    </div>
    <p className="muted" style={{marginTop:10}}>Mode: {h?.mode||'—'} · uptime: {h?.uptime?Math.round(h.uptime)+'s':'—'}</p>
   </div>
  </section>
  <section className="section container"><p className="muted">This page checks the API connection only. It does not independently monitor mail delivery, payments, workers or incident history.</p></section>
  <section className="section container"><div className="footer-cta"><div><h3>Want incident emails?</h3><p className="muted">Status subscriptions are configured per workspace in Settings → Notifications.</p></div><Link className="btn" href="/contact">Contact support</Link></div></section>
 </>;
}

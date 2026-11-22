'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '../../../lib/api';
export default function Invite(){
 const router=useRouter();
 const [email,setEmail]=useState(''),[token,setToken]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setBusy(true);
  try{await post('/team/invite/accept',{email,token});setMsg('Invitation accepted. Redirecting…');setTimeout(()=>router.push('/dashboard'),450);}
  catch(err){setMsg(err.message);} finally{setBusy(false);}};
 return <>
  <section className="container auth-layout" style={{paddingTop:60,paddingBottom:60}}>
   <div className="auth-side"><div className="badge ok">Team</div><h1>Join the<br/><span className="grad">workspace.</span></h1>
    <p className="lead">Invites reserve a seat for 7 days and carry the role your admin chose.</p>
    <ul className="auth-list"><li><b>✓</b> Scoped permissions from day one</li><li><b>✓</b> Shared templates and lists</li><li><b>✓</b> Audit log records every invite</li></ul>
   </div>
   <form className="auth-panel" onSubmit={submit}>
    <h2>Accept invitation</h2><p className="muted">Enter the email the invite was sent to and your token.</p>
    <label>Your email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
    <label>Invite token</label><input required value={token} onChange={e=>setToken(e.target.value)}/>
    <button className="btn" style={{marginTop:18,width:'100%'}} disabled={busy}>{busy?'Joining…':'Join workspace'}</button>
    {msg&&<p className="notice" style={{marginTop:12}}>{msg}</p>}
    <p className="muted" style={{marginTop:16}}>No invite? <Link href="/signup">Create your own workspace</Link></p>
   </form>
  </section>
 </>;
}

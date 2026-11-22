'use client';
import { useState } from 'react';
import Link from 'next/link';
import { post } from '../../../lib/api';

const topics=['Sales','Support','Partnership','Security','Other'];
const empty={name:'',email:'',company:'',topic:'Sales',message:''};
export default function Contact(){
 const [form,setForm]=useState(empty),[errors,setErrors]=useState({}),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(null);
 function set(key,value){setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:null}));setFailure('');}
 async function submit(event){
  event.preventDefault();if(busy)return;const next={};
  if(form.name.trim().length<2)next.name='Please enter your name.';
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim()))next.email='Please enter a valid email address.';
  if(form.message.trim().length<12)next.message='Please tell us a little more (at least 12 characters).';
  setErrors(next);if(Object.keys(next).length)return;setBusy(true);
  try{const result=await post('/contact',{...form,name:form.name.trim(),email:form.email.trim(),company:form.company.trim(),message:form.message.trim()});setDone({...result,name:form.name.trim()});setForm(empty);}
  catch(e){const fields=e.details?.fields;if(Array.isArray(fields))setErrors(Object.fromEntries(fields.map(f=>[f.field,f.message])));setFailure(e.message||'Could not send your message. Your draft is still here.');}finally{setBusy(false);}
 }
 return <main className="contact-page">
  <section className="container contact-grid">
   <div className="contact-intro"><div className="contact-label"><span/> WE’RE HERE TO HELP</div>
    <h1>Let’s make<br/><em>something click.</em></h1>
    <p>Have a question, an idea, or a challenge with your email workflow? Tell us what’s on your mind.</p>
    <div className="contact-intro-card"><div className="contact-icon">↗</div><div><b>A better conversation starts here.</b><p>Choose a topic and share the details. Your message goes to the Emavanta team.</p></div></div>
    <div className="contact-info"><div><span>01</span><div><b>Something on your mind?</b><small>Questions about the platform, plans or setup.</small></div></div><div><span>02</span><div><b>Already part of Emavanta?</b><small>Choose Support and tell us how we can help.</small></div></div></div>
    <Link className="contact-back" href="/pricing">Explore our plans <span>→</span></Link>
   </div>
   <div className="contact-form-shell">
    {done?<div className="contact-success" role="status"><div className="contact-success-icon">✓</div><div className="contact-overline">MESSAGE RECEIVED</div><h2>Thanks, {done.name}.</h2><p>We saved your message and queued an email notification for our team. We’ll use <b>{done.email}</b> to reply.</p><div className="contact-reference">REFERENCE <b>#{done.reference}</b></div><button type="button" className="btn secondary" onClick={()=>setDone(null)}>Send another message</button></div>:
    <form onSubmit={submit} noValidate><div className="contact-form-heading"><div><div className="contact-overline">DROP US A NOTE</div><h2>Tell us more.</h2><p>Fields marked * are required.</p></div><div className="contact-form-mark">✳</div></div>
     <div className="contact-fields">
      <div><label htmlFor="ct-name">Your name <span>*</span></label><input id="ct-name" required maxLength={80} autoComplete="name" placeholder="Your full name" value={form.name} onChange={e=>set('name',e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name?'ct-name-error':undefined}/>{errors.name&&<span id="ct-name-error" className="field-error">{errors.name}</span>}</div>
      <div><label htmlFor="ct-email">Email address <span>*</span></label><input id="ct-email" type="email" required maxLength={160} autoComplete="email" placeholder="you@company.com" value={form.email} onChange={e=>set('email',e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email?'ct-email-error':undefined}/>{errors.email&&<span id="ct-email-error" className="field-error">{errors.email}</span>}</div>
      <div><label htmlFor="ct-company">Company <small>Optional</small></label><input id="ct-company" maxLength={100} autoComplete="organization" placeholder="Your company" value={form.company} onChange={e=>set('company',e.target.value)} aria-invalid={!!errors.company}/>{errors.company&&<span className="field-error">{errors.company}</span>}</div>
      <div><label htmlFor="ct-topic">What can we help with? <span>*</span></label><select id="ct-topic" value={form.topic} onChange={e=>set('topic',e.target.value)}>{topics.map(t=><option key={t}>{t}</option>)}</select>{errors.topic&&<span className="field-error">{errors.topic}</span>}</div>
      <div className="contact-message-field"><div className="contact-message-label"><label htmlFor="ct-message">Your message <span>*</span></label><small>{form.message.length} / 2,000</small></div><textarea id="ct-message" required rows={6} maxLength={2000} placeholder="Tell us a little about what you need…" value={form.message} onChange={e=>set('message',e.target.value)} aria-invalid={!!errors.message} aria-describedby={errors.message?'ct-message-error':undefined}/>{errors.message&&<span id="ct-message-error" className="field-error">{errors.message}</span>}</div>
     </div>
     <button className="btn contact-submit" disabled={busy}>{busy?'Sending your message…':<>Send message <span aria-hidden="true">↗</span></>}</button>
     {failure&&<div className="contact-failure" role="alert">{failure} Your draft is still here.</div>}
     <p className="contact-privacy">We use your details to respond to this request. Please don’t include passwords or sensitive information. <Link href="/legal/privacy">Privacy policy</Link></p>
    </form>}
   </div>
  </section>
 </main>;
}

'use client';
import { useEffect, useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getStrict, post } from '../lib/api';

function CardForm({payment, onSettled, onCanceled}) {
 const stripe=useStripe(), elements=useElements();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function check(){
  const result=await post(`/billing/stripe/${encodeURIComponent(payment.orderId)}/status`,{});
  if(result.status==='paid'){onSettled(result);return true;}
  setMessage(result.message||(result.providerStatus==='requires_payment_method'?'Card not confirmed. You may retry this same order with another card.':'Payment is not confirmed yet. Refresh status before paying again.'));return false;
 }
 async function pay(e){
  e.preventDefault();if(!stripe||!elements||busy)return;setBusy(true);setError('');setMessage('');
  try {
   const card=elements.getElement(CardElement);if(!card)throw Error('The secure card field is not ready.');
   const result=await stripe.confirmCardPayment(payment.clientSecret,{payment_method:{card}});
   if(result.error){setError(result.error.message||'The card payment could not be completed.');await check();}
   else await check();
  }catch{setError('Could not confirm payment status. Do not pay again; refresh status or contact support.');}
  finally{setBusy(false);}
 }
 return <form onSubmit={pay}>
  <div style={{padding:14,background:'#fff',border:'1px solid #dce4ee',borderRadius:8,margin:'12px 0'}}><CardElement options={{hidePostalCode:false}}/></div>
  <p className="muted">Secure card fields are provided by Stripe. This is a one-time plan payment; it does not renew automatically.</p>
  {payment.testMode&&<p className="notice warn">Test mode: no real card charge.</p>}
  <button className="btn" type="submit" disabled={!stripe||busy}>{busy?'Checking…':'Pay securely'}</button>{' '}
  <button className="btn secondary" type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await check();}catch{setError('Status could not be checked. Do not pay again.');}finally{setBusy(false);}}}>Refresh status</button>
  <button className="btn ghost" type="button" disabled={busy} onClick={async()=>{if(!window.confirm('Cancel this unfinished card payment?'))return;setBusy(true);try{await post(`/billing/stripe/${encodeURIComponent(payment.orderId)}/cancel`,{});onCanceled();}catch(e){setError(e.message);}finally{setBusy(false);}}}>Cancel card payment</button>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="notice warn">{error}</p>}
 </form>;
}
export default function StripeCardCheckout({sessionId,kind,onSettled,onStarted}) {
 const [available,setAvailable]=useState(null),[pending,setPending]=useState(null),[payment,setPayment]=useState(null),[client,setClient]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;Promise.all([getStrict('/billing/stripe/availability'),getStrict('/billing/stripe/pending')]).then(([a,p])=>{if(active){setAvailable(a);setPending(p?.orderId?p:null);if(p?.orderId)onStarted?.();}}).catch(()=>{if(active)setAvailable({available:false});});return()=>{active=false;};},[sessionId]);
 async function start(){
  if(busy)return;setBusy(true);setError('');const id=pending?.orderId||sessionId;
  try {const r=await post(`/billing/stripe/${encodeURIComponent(id)}/prepare`,{});
   if(r.status==='paid'){onSettled(r);return;}
   if(r.status==='review'){setError(r.message);return;}
   if(!r.clientSecret||!r.publishableKey)throw Error('Card payment is not ready. Do not create another payment.');
   const stripeInstance=await loadStripe(r.publishableKey);if(!stripeInstance)throw Error('Secure card fields could not load. Check your connection and resume this payment.');
   setClient(stripeInstance);setPayment(r);onStarted?.();
  }catch(e){setError(e.message||'Unable to start card payment.');}finally{setBusy(false);}
 }
 if(!available?.available || kind!=='plan')return null;
 return <div className="notice" style={{marginTop:14}}><b>Pay securely by card</b>
  {pending && !payment && <p>Existing card order: {pending.plan}, ${pending.amount} ({pending.status}). Resume it before starting another payment.</p>}
  {!payment?<button type="button" className="btn secondary" onClick={start} disabled={busy||pending?.status==='stripe_review'}>{busy?'Preparing…':pending?'Resume card payment':'Continue with card'}</button>:
   <Elements stripe={client}><CardForm payment={payment} onSettled={onSettled} onCanceled={()=>{setPayment(null);setPending(null);setError('Card payment canceled. Close checkout and start a new order.');}}/></Elements>}
  {pending?.status==='stripe_review'&&<p>Payment needs manual review. Contact support; do not pay again.</p>}
  {error&&<p role="alert" className="notice warn">{error}</p>}
 </div>;
}

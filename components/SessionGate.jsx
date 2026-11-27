'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStrict } from '../lib/api';
import SessionLoading from './SessionLoading';

// The server remains the security boundary. Never show dashboard children until
// /auth/me has checked the bearer token, revocation and active membership.
export default function SessionGate({ children, mode }) {
 const router=useRouter(), [state,setState]=useState('checking'), [offlineReason,setOfflineReason]=useState(''), epoch=useRef(0), transientRetries=useRef(0);
 const check=useCallback(async()=>{
  const current=++epoch.current;
  let token='';try{token=localStorage.getItem('emavanta_token')||'';}catch{}
  if(!token){if(mode==='dashboard'){setState('checking');router.replace('/signin');}else setState('ready');return;}
  try {
   const me=await getStrict('/auth/me');
   if(current!==epoch.current)return;
   if(!me?.user?.id)throw Object.assign(new Error('Incomplete session response'),{status:502,code:'INVALID_AUTH_RESPONSE'});
   transientRetries.current=0;
   if(mode==='guest'){setState('checking');router.replace('/dashboard');}else setState('ready');
  }catch(e){
   if(current!==epoch.current)return;
   if(e.status===401){try{if(localStorage.getItem('emavanta_token')===token){localStorage.removeItem('emavanta_token');localStorage.removeItem('emavanta_email');}}catch{}
    if(mode==='dashboard'){setState('checking');router.replace('/signin');}else setState('ready');
   } else {
    // Transient failures (empty/incomplete session response, database blip,
    // unreachable API) must NEVER sign the user out — auto-retry a couple of
    // times before falling back to the "session not signed out" screen.
    const transient=['INVALID_AUTH_RESPONSE','EMPTY_RESPONSE','DATABASE_UNAVAILABLE','API_OFFLINE'].includes(e.code)||e.status===502||e.status===503;
    if(transient && transientRetries.current<2){
     transientRetries.current++;
     setState('checking');
     setTimeout(()=>{if(current===epoch.current)void check();},2500);
     return;
    }
    setOfflineReason(e.code==='DATABASE_UNAVAILABLE'?'The database connection is temporarily unavailable. Please try again shortly.':'The service could not be reached. Please try again.');
    setState('offline');
   }
  }
 },[mode,router]);
 useEffect(()=>{
  void check();
  const changed=e=>{if(!e.key||e.key==='emavanta_token')void check();};
  const focus=()=>{if(document.visibilityState==='visible')void check();};
  const invalid=()=>void check();
  window.addEventListener('storage',changed);window.addEventListener('emavanta:session-invalid',invalid);document.addEventListener('visibilitychange',focus);
  return()=>{epoch.current++;window.removeEventListener('storage',changed);window.removeEventListener('emavanta:session-invalid',invalid);document.removeEventListener('visibilitychange',focus);};
 },[check]);
 if(state==='ready')return children;
 if(state==='offline')return <main style={{padding:40,fontFamily:'sans-serif'}}><h1>Unable to check your session</h1><p>{offlineReason} Your session has not been signed out.</p><button type="button" onClick={()=>{setState('checking');void check();}}>Try again</button></main>;
 return <SessionLoading />;
}

'use client';
import { useEffect, useState } from 'react';
import { Interface, hexlify, toUtf8Bytes } from 'ethers';
import { getStrict, post } from '../lib/api';

const RECOVERY_KEY='emavanta_pending_usdt_v1';
const erc20 = new Interface(['function transfer(address to, uint256 value) returns (bool)']);
const isWallet = value => /^0x[0-9a-f]{40}$/i.test(String(value||''));
function readPending(){try{return JSON.parse(localStorage.getItem(RECOVERY_KEY)||'null');}catch{return null;}}
export default function CryptoWalletNotice({sessionId,kind,onStarted,onBusy,onPending,onCleared,onSubmitted}) {
 const [available,setAvailable]=useState(null),[busy,setBusy]=useState(false),[accepted,setAccepted]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(null),[message,setMessage]=useState(''),[lockedOrder,setLockedOrder]=useState(null);
 const [address,setAddress]=useState(''),[chain,setChain]=useState(''),[resumeExisting,setResumeExisting]=useState(false);
 useEffect(()=>{onBusy?.(busy);return ()=>onBusy?.(false);},[busy]);
 useEffect(()=>{
  let active=true;
  setPending(readPending());
  Promise.all([getStrict('/billing/crypto/availability'),getStrict('/billing/crypto/pending')]).then(async([a,l])=>{if(!active)return;setAvailable(a);if(l?.orderId){setLockedOrder(l);onPending?.(l);onStarted?.();}
   const saved=readPending();if(saved?.uncertain&&saved.orderId&&l?.orderId!==saved.orderId){try{const r=await getStrict(`/billing/crypto/${encodeURIComponent(saved.orderId)}/recovery-status`);if(active&&r.status==='canceled'&&r.manualReconciled){localStorage.removeItem(RECOVERY_KEY);setPending(null);setMessage('The owner closed the old order after manual investigation. Check your wallet history before making another payment.');}}catch{ /* Keep the marker if status cannot be verified. */ }}
  }).catch(()=>{if(active)setAvailable({available:false});});
  const provider=window.ethereum;
  const accountsChanged=accounts=>{setAddress(isWallet(accounts?.[0])?accounts[0]:'');};
  const chainChanged=id=>{setChain(String(id||'').toLowerCase());};
  provider?.on?.('accountsChanged',accountsChanged);provider?.on?.('chainChanged',chainChanged);
  return ()=>{active=false;provider?.removeListener?.('accountsChanged',accountsChanged);provider?.removeListener?.('chainChanged',chainChanged);};
 },[]);
 async function connectWallet(){
  if(busy)return;setBusy(true);setError('');setMessage('');
  try{
   if(!window.ethereum?.request)throw Error('Install or open a browser wallet that supports BNB Smart Chain.');
   const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
   if(!isWallet(accounts?.[0]))throw Error('No valid wallet was selected.');
   const network=String(await window.ethereum.request({method:'eth_chainId'})||'').toLowerCase();
   setAddress(accounts[0]);setChain(network);
   setMessage(network==='0x38'?'Wallet connected. No payment has been sent.':'Wallet connected. Switch to BNB Smart Chain mainnet before confirming payment.');
  }catch(e){setError(e?.code===4001?'Wallet connection was cancelled.':(e?.message||'Could not connect the wallet.'));}
  finally{setBusy(false);}
 }
 async function switchNetwork(){
  if(busy||!window.ethereum?.request)return;setBusy(true);setError('');
  try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x38'}]});setChain(String(await window.ethereum.request({method:'eth_chainId'})||'').toLowerCase());}
  catch(e){setError(e?.code===4001?'Network switch was cancelled.':'Switch your wallet to BNB Smart Chain mainnet and try again.');}
  finally{setBusy(false);}
 }
 async function cancelOrder(order){
  if(!order?.orderId||busy)return;
  if(!window.confirm('Cancel this order? Only an order that has not requested a transfer can be canceled automatically.'))return;
  setBusy(true);setError('');
  try{await post(`/billing/crypto/${encodeURIComponent(order.orderId)}/cancel`,{});
   if(pending?.orderId===order.orderId){try{localStorage.removeItem(RECOVERY_KEY);}catch{}setPending(null);}
   setLockedOrder(null);setResumeExisting(false);onPending?.(null);onCleared?.();setMessage('Order canceled. No transfer was requested through this checkout.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function requestCancellation(order){
  if(!order?.orderId||busy)return;
  if(!window.confirm('Request cancellation? If a transfer was made it cannot be reversed here. Your order stays locked until the owner investigates.'))return;
  setBusy(true);setError('');
  try{const r=await post(`/billing/crypto/${encodeURIComponent(order.orderId)}/request-cancellation`,{});const updated={...order,cancelRequestedAt:r.requestedAt};setLockedOrder(updated);onPending?.(updated);setMessage('Cancellation requested. The owner will review the payment; do not send another transfer.');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function submit(item){
  if(!item)return;setBusy(true);setError('');
  try{const r=await post(`/billing/crypto/${encodeURIComponent(item.orderId)}/submit`,{txHash:item.txHash,signature:item.signature});
   try { localStorage.removeItem(RECOVERY_KEY); } catch {} setPending(null);const next=lockedOrder?{...lockedOrder,status:'crypto_submitted',cancelable:false}:null;setLockedOrder(next);onPending?.(next);setMessage(`Transaction submitted for owner review: ${r.txHash}. Your purchase is not active until approved.`); onSubmitted?.(r);
  }catch(e){setError(`${e.message} ${item.saved === false ? 'Recovery could not be saved on this device: copy the transaction hash now and contact support if retry fails.' : 'Your transaction hash is saved on this device; retry submission.'} Do not send another payment.`);}finally{setBusy(false);}
 }
 async function pay(){
  if(!available?.available||!accepted||busy||!sessionId||!address||chain!=='0x38')return;
  if(pending){setError('Submit the saved transaction first. Do not send a second payment.');return;}
  if(lockedOrder&&lockedOrder.orderId!==sessionId&&!resumeExisting){setError('Select Resume existing order first.');return;}
  setError('');setMessage('');setBusy(true);
  try{
   const provider=window.ethereum;if(!provider?.request)throw Error('Your wallet is not available. Connect it again.');
   const accountNow=await provider.request({method:'eth_accounts'});
   if(!isWallet(accountNow?.[0])||accountNow[0].toLowerCase()!==address.toLowerCase())throw Error('The selected wallet changed. Connect it again before paying.');
   if(String(await provider.request({method:'eth_chainId'})).toLowerCase()!=='0x38')throw Error('Switch your wallet to BNB Smart Chain mainnet.');
   const orderId=lockedOrder?.orderId||sessionId;
   const prep=await post(`/billing/crypto/${encodeURIComponent(orderId)}/prepare`,{wallet:address,termsAccepted:true});
   onStarted?.(); const prepared={orderId,kind:prep.kind,plan:prep.plan,code:prep.code,quantity:prep.quantity,interval:prep.interval,amount:prep.amount,status:'pending',expiresAt:prep.expiresAt,cancelable:true};setLockedOrder(prepared);onPending?.(prepared);
   if(!window.confirm(`Send exactly ${prep.amount} USDT on BNB Smart Chain to ${prep.recipient}? Your wallet will also charge BNB network fees. Payment is irreversible, is subject to the terms shown, and needs owner review.`)){
    try{await post(`/billing/crypto/${encodeURIComponent(orderId)}/cancel`,{});setLockedOrder(null);onPending?.(null);onCleared?.();setMessage('Order canceled. No transfer was requested.');}catch{setError('Order could not be canceled. Contact support before paying again.');}return;
   }
   const signature=await provider.request({method:'personal_sign',params:[hexlify(toUtf8Bytes(prep.message)),address]});
   if(Date.now()>=Date.parse(prep.expiresAt)-90000)throw Error('This quote is too close to expiry. Contact support before sending funds.');
   const selected=await provider.request({method:'eth_accounts'});
   if(!isWallet(selected?.[0])||selected[0].toLowerCase()!==address.toLowerCase())throw Error('The selected wallet changed. No payment was requested.');
   if(String(await provider.request({method:'eth_chainId'})).toLowerCase()!=='0x38')throw Error('The network changed. Switch back to BNB Smart Chain before sending.');
   const data=erc20.encodeFunctionData('transfer',[prep.recipient,BigInt(prep.amount)*10n**18n]);
   // Persist an uncertainty marker before asking the wallet to broadcast. A
   // closed tab or provider error must not silently enable a second transfer.
   const uncertain={orderId,uncertain:true};
   try { localStorage.setItem(RECOVERY_KEY,JSON.stringify(uncertain)); } catch { throw Error('This device cannot save payment recovery information. No transfer was requested.'); }
   setPending(uncertain);
   await post(`/billing/crypto/${encodeURIComponent(orderId)}/begin-transfer`,{});
   const begun={...prepared,cancelable:false,transferStarted:true};setLockedOrder(begun);onPending?.(begun);
   let txHash;
   try {txHash=await provider.request({method:'eth_sendTransaction',params:[{from:address,to:prep.token,data,value:'0x0'}]});}
   catch(e){throw e;}
   if(!/^0x[0-9a-f]{64}$/i.test(String(txHash)))throw Error('Wallet did not return a transaction hash. Check your wallet and contact support before trying again.');
   const item={orderId,txHash,signature,saved:true};
   try { localStorage.setItem(RECOVERY_KEY,JSON.stringify(item)); } catch { item.saved=false; }
   setPending(item);setMessage(`Transaction sent: ${txHash}. Submitting for owner review…`);await submit(item);
  }catch(e){setError(e?.code===4001?'Wallet request was cancelled or interrupted. Check wallet history and contact support before sending again.':(e?.message||'Wallet operation failed. Check your wallet before retrying.'));}
  finally{setBusy(false);}
 }
 const orderBlocked=lockedOrder && (lockedOrder.status!=='pending'||lockedOrder.cancelRequestedAt||lockedOrder.transferStarted||lockedOrder.legacy||Date.parse(lockedOrder.expiresAt)<=Date.now());
 const differingOrder=lockedOrder&&lockedOrder.orderId!==sessionId;
 return <div className={`notice ${available?.available?'':'warn'}`} style={{marginTop:14}}>
  <b>USDT · BNB Smart Chain (BEP-20)</b>
  {lockedOrder && <div><p>Existing USDT order: {lockedOrder.kind==='addon'?`${lockedOrder.code} × ${lockedOrder.quantity}`:lockedOrder.plan||'plan'} · {lockedOrder.amount} USDT · {lockedOrder.status}. The summary above shows this existing order, not the new selection.</p>
   {differingOrder&&!orderBlocked&&!resumeExisting&&<button type="button" className="btn secondary" onClick={()=>setResumeExisting(true)} disabled={busy}>Resume existing order</button>}{' '}
   {lockedOrder.cancelable&&<button type="button" className="btn ghost" onClick={()=>cancelOrder(lockedOrder)} disabled={busy}>Cancel existing order</button>}
   {!lockedOrder.cancelable&&['pending','crypto_submitted'].includes(lockedOrder.status)&&!lockedOrder.cancelRequestedAt&&<button type="button" className="btn ghost" onClick={()=>requestCancellation(lockedOrder)} disabled={busy}>Request cancellation</button>}
   {lockedOrder.cancelRequestedAt&&<p role="status">Cancellation requested. The owner must investigate before this order can be closed. Do not send another payment.</p>}
   {(lockedOrder.legacy||lockedOrder.transferStarted)&&<p>Transfer status needs reconciliation. Contact support with your wallet history; do not send another payment.</p>}
  </div>}
  {pending?.uncertain && <p role="alert">A wallet transfer request was interrupted. Check your wallet history and contact support with any transaction hash. Do not send another payment.</p>}
  {pending && !pending.uncertain && <div><p><b>{pending.saved === false ? 'Unsubmitted transaction (not saved on this device):' : 'Unsubmitted transaction saved:'}</b> <span style={{overflowWrap:'anywhere'}}>{pending.txHash}</span></p><button type="button" className="btn secondary" disabled={busy} onClick={()=>submit(pending)}>Submit saved transaction</button><p>Do not send another payment. If this device is lost, contact support with the transaction hash.</p></div>}
  {!orderBlocked&&<>
   <p>Connect your wallet first. Connecting does not send funds. Only USDT on BNB Smart Chain is supported; BNB is needed for network fees.</p>
   <button type="button" className="btn secondary" onClick={connectWallet} disabled={busy}>{address ? 'Reconnect wallet' : 'Connect wallet'}</button>
   {address&&<p>Connected: <b>{address.slice(0,6)}…{address.slice(-4)}</b> · {chain==='0x38'?'BNB Smart Chain':'Wrong network'} {chain!=='0x38'&&<button type="button" className="btn ghost sm" disabled={busy} onClick={switchNetwork}>Switch network</button>}</p>}
   {available===null ? <p>Checking payment setup…</p> : !available.available && <p>Payment confirmation is temporarily unavailable. Please contact support before sending funds.</p>}
   {orderBlocked&&<p>This order cannot accept a new transfer. Contact support if you have already sent funds.</p>}
   <p>Owner review is expected in 5–15 minutes but may take longer. The purchase activates only after approval; there is no automatic renewal. Add-ons last one month from approval.</p>
   <label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> I understand transfers are irreversible and payments are non-refundable except where applicable law requires otherwise.</label>
   <p><button type="button" className="btn" onClick={pay} disabled={busy||!available?.available||!accepted||!address||chain!=='0x38'||!!pending||!!orderBlocked||(!!differingOrder&&!resumeExisting)}>{busy?'Working…':'Confirm payment'}</button></p>
  </>}
  {message&&<p role="status" style={{overflowWrap:'anywhere'}}>{message}</p>}{error&&<p role="alert" style={{overflowWrap:'anywhere'}}>{error}</p>}
 </div>;
}

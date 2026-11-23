'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStrict, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';

const localNow = () => { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const termEnd = (raw, interval) => { const d=new Date(raw); if (!Number.isFinite(d.getTime())) return null; const day=d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+(interval==='year'?12:1)); const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(); d.setUTCDate(Math.min(day,last)); return d; };

export default function Admin() {
 const [access,setAccess]=useState(null), [error,setError]=useState(''), [spaces,setSpaces]=useState([]), [users,setUsers]=useState([]), [plans,setPlans]=useState([]), [busy,setBusy]=useState(''), [setup,setSetup]=useState(null), [redisCheck,setRedisCheck]=useState(null), [payments,setPayments]=useState([]), [cardPayments,setCardPayments]=useState([]), [cryptoLocks,setCryptoLocks]=useState([]), [userPage,setUserPage]=useState(0), [pendingCount,setPendingCount]=useState(0),[contactMessages,setContactMessages]=useState([]),[editingPlan,setEditingPlan]=useState(null),[selectedPlan,setSelectedPlan]=useState(''),[planReason,setPlanReason]=useState(''),[planInterval,setPlanInterval]=useState('month'),[planStart,setPlanStart]=useState(''),[planSnapshot,setPlanSnapshot]=useState(null);
 const [loading,setLoading]=useState(true), [activeTab,setActiveTab]=useState('overview');
 async function load(page=userPage) {
  setError('');
  try {
   const a = await getStrict('/admin/access'); setAccess(a);
   if (!a.owner || !a.ready) return;
   const [w,u,p,s,transactions,cards,locks,summary,contacts] = await Promise.all([getStrict('/admin/workspaces'),getStrict(`/admin/users?skip=${page*50}`),getStrict('/billing/plans'),getStrict('/admin/setup-status'),getStrict('/admin/crypto/payments'),getStrict('/admin/stripe/payments'),getStrict('/admin/crypto/locks'),getStrict('/admin/crypto/summary'),getStrict('/admin/contact-messages')]);
   setSpaces(w); setUsers(u); setPlans(p.plans || []); setSetup(s); setPayments(transactions); setCardPayments(cards); setCryptoLocks(locks); setPendingCount(summary.pending||0);setContactMessages(Array.isArray(contacts)?contacts:[]);
  } catch(e) { setError(e.message); }
  finally { setLoading(false); }
 }
 useEffect(()=>{void load(userPage); const timer=setInterval(()=>void load(userPage),30000); return ()=>clearInterval(timer);},[userPage]);
 async function setUserStatus(u,status){
  const reason=window.prompt(`Reason to set ${u.email} to ${status} (10–500 characters):`);
  if(!reason)return;
  if(!window.confirm(`${status==='deleted'?'Soft-delete':status==='suspended'?'Suspend':'Restore'} ${u.email}? Sessions and API keys will be revoked. Workspace and billing records are retained.`))return;
  setBusy(u.id);setError('');
  try{await post(`/admin/users/${encodeURIComponent(u.id)}/status`,{status,reason});await load();}catch(e){setError(e.message);}finally{setBusy('');}
 }
 async function reviewPayment(p) {
  if (!window.confirm(`Verify on-chain and activate ${p.kind==='addon'?`${p.code} × ${p.quantity}`:p.plan} for workspace ${p.organizationId}? Review the transaction and amount first.`)) return;
  setBusy(p.txHash); setError('');
  try {const result=await post(`/admin/crypto/payments/${p.txHash}/approve`,{});alert(result.alreadyApproved?'Already approved.':`Approved. Term ends ${result.expiresAt}.`);await load();}
  catch(e){setError(e.message);} finally{setBusy('');}
 }
 async function rejectPayment(p){
  const reason=window.prompt('Reason for rejecting this review (10–500 characters):');if(!reason)return;
  if(!window.confirm('Reject review? This does not refund or reverse the blockchain transfer. The payment lock stays in place for manual reconciliation.'))return;
  setBusy(p.txHash);try{const r=await post(`/admin/crypto/payments/${p.txHash}/reject`,{reason});alert(r.message);await load();}catch(e){setError(e.message);}finally{setBusy('');}
 }
 async function resolveLock(l){
  const reason=window.prompt('Explain your investigation and why no transfer was made (at least 20 characters):');if(!reason)return;
  if(!window.confirm('You must independently check the wallet, pending transactions and blockchain. Closing this lock cannot stop or refund a transfer and may permit another payment. Have you confirmed no transfer was made?'))return;
  setBusy(l.orderId);try{const r=await post(`/admin/crypto/locks/${encodeURIComponent(l.orderId)}/resolve`,{organizationId:l.organizationId,reason,confirmedNoTransfer:true});alert(r.message);await load();}catch(e){setError(e.message);}finally{setBusy('');}
 }
 async function settleRejected(l){
  const reason=window.prompt('Describe how the rejected transfer and any refund obligations were reconciled outside this platform (at least 20 characters):');if(!reason)return;
  if(!window.confirm('Only close this lock after independently reconciling funds and refund obligations. This action does not issue a refund or reverse a transfer, and permits new payments. Continue?'))return;
  setBusy(l.orderId);try{const r=await post(`/admin/crypto/locks/${encodeURIComponent(l.orderId)}/resolve-rejected`,{organizationId:l.organizationId,reason,confirmedReconciled:true});alert(r.message);await load();}catch(e){setError(e.message);}finally{setBusy('');}
 }
 async function checkRedis(){setBusy('redis-check');setError('');try{setRedisCheck(await post('/admin/upstash/check',{}));}catch(e){setError(e.message);}finally{setBusy('');}}
 async function retryContact(m){setBusy(m.id);setError('');try{const r=await post(`/admin/contact-messages/${encodeURIComponent(m.id)}/retry`,{});alert(r.message);await load();}catch(e){setError(e.message);}finally{setBusy('');}}
 async function retryAlert(p) {setBusy(p.txHash);try{const r=await post(`/admin/crypto/payments/${p.txHash}/notify`,{});alert(`Email status: ${r.status}`);await load();}catch(e){setError(e.message);}finally{setBusy('');}}
 async function checkCard(p){setBusy(p._id);try{const r=await post(`/admin/stripe/payments/${p._id}/check`,{});alert(r.message||`Payment status: ${r.status}`);await load();}catch(e){setError(e.message);}finally{setBusy('');}}
 async function changePlan(w) {
  const plan=selectedPlan, reason=planReason.trim(), expected=planSnapshot || w;
  if (!plans.some(p=>p.code===plan)||reason.length<10||reason.length>500) {setError('Select a plan and enter a reason of 10–500 characters.');return;}
  const parsed=plan==='free' ? null : new Date(planStart);
  if(plan!=='free' && (!parsed || !Number.isFinite(parsed.getTime()) || parsed.getTime()>Date.now()+60000 || termEnd(planStart,planInterval)<=new Date())) {setError('Choose a start time in the past or present and an active term.');return;}
  if (!window.confirm(`Assign ${plan} to ${w.name}${parsed ? ` for a ${planInterval==='year'?'yearly':'monthly'} term ending ${termEnd(planStart,planInterval).toLocaleString()}` : ' without an expiry'}? This records no payment and does not auto-renew. Pending payments may require review.`)) return;
  setBusy(w.id);setError('');
  try { const r=await post(`/admin/workspaces/${encodeURIComponent(w.id)}/plan`,{plan,reason,expectedPlan:expected.plan,expectedSource:expected.planSource,expectedExpiry:expected.planExpiresAt,expectedStart:expected.planStartedAt,...(parsed?{interval:planInterval,startedAt:parsed.toISOString()}:{})}); alert(r.message);setEditingPlan(null);setPlanReason('');await load(); }
  catch(e){setError(e.message);} finally {setBusy('');}
 }

 return <>
  <PageHead title="Platform administration" subtitle="Owner-only workspace and account oversight" actions={<button className="btn secondary sm" onClick={()=>load()}>Refresh</button>}/>
  {error && <div className="notice warn" role="alert">{error}</div>}
  {access && !access.owner && <div className="notice warn">Only the configured platform owner can access this page.</div>}
  {access?.owner && !access.ready && <div className="notice warn">Enable two-factor authentication in <Link href="/dashboard/security">Security</Link>, then sign out and sign back in using your authenticator to unlock this page.</div>}
  {loading && <DashboardSkeleton variant="admin" showHeader={false} />}
  {access?.ready && !loading && <>
   {cryptoLocks.some(l=>l.cancelRequestedAt)&&<div className="notice warn" role="status"><b>Cancellation requests:</b> Customers asked to cancel open USDT orders. Investigate wallet history and any transfers before closing them.</div>}
   {pendingCount>0&&<div className="notice warn" role="status"><b>Payment alert:</b> {pendingCount} USDT payment(s) awaiting your review.</div>}
   <nav className="admin-workspace-tabs" role="tablist" aria-label="Administration work areas">
    {[['overview','Overview',''],['payments','Payments',pendingCount||''],['workspaces','Workspaces',spaces.length||''],['users','Users',users.length||''],['support','Support',contactMessages.length||'']].map(([key,label,count])=><button key={key} type="button" role="tab" aria-selected={activeTab===key} className={activeTab===key?'active':''} onClick={()=>setActiveTab(key)}>{label}{count!==''&&<span className="badge">{count}</span>}</button>)}
   </nav>
   {activeTab==='overview'&&<div className="admin-tab-content">
   <div className="notice warn">Crypto review requires a verified on-chain transfer and owner approval. Email delivery may fail; check the dashboard. Manual plan overrides do not record payments. Independently test and review the integration before accepting funds.</div>
   {setup && <div className="card luxe-card" style={{marginTop:16}}><h2>Connection status</h2>
    <p>Database: {setup.database.connected?'connected':'not connected'} · Queue: {setup.queue.ready?'MongoDB-backed':'in-memory, not durable'}</p>
    <p>Email: {setup.smtp.configured?'configured; delivery not verified':'not configured'} · BSC wallet: {setup.bsc.addressConfigured?'address format valid':'not configured or invalid'} · RPC: {setup.bsc.rpcConfigured?'configured, not verified':'not configured'}</p>
    <p>Contact notifications: {setup.contact?.ownerConfigured?'owner email configured':'owner email missing'} · SMTP {setup.smtp?.configured?'configured (delivery not yet verified)':'not configured'} · workers {setup.contact?.workerEmbedded?'embedded on API':'must run separately'}.</p>
    <div className="notice"><b>Upstash Redis</b> · rate limiter: {setup.redis?.driver||'unknown'} · {setup.redis?.configured?'credentials configured':'credentials missing'}. MongoDB is the queue backend. <button className="btn secondary sm" disabled={!!busy} onClick={checkRedis}>{busy==='redis-check'?'Checking…':'Test Redis connection'}</button>{redisCheck&&<p role="status">{redisCheck.ok?'PING and multi-key Lua test passed.':'Redis test failed; check backend URL, token, network and Lua support.'} {redisCheck.ok&&redisCheck.driver!=='upstash'?'Redis is reachable but is not selected as the rate limiter.':''}</p>}</div>
    <p>Card payments: {setup.stripe?.available?'configuration prerequisites passed':'disabled or prerequisites missing'} · Crypto: {setup.cryptoReview?.available?'configuration prerequisites passed':'disabled or prerequisites missing'}</p>
    {setup.cryptoReview?.checks && <div><b>USDT setup checks</b><ul>{Object.entries({enabled:'Crypto enabled in backend',database:'MongoDB connected',transactions:'MongoDB transactions',ownerConfigured:'Owner email configured',ownerVerifiedMfa:'Owner verified with MFA',jwtSecure:'Strong JWT secret',smtpConfigured:'SMTP host and sender configured',smtpSettingsValid:'SMTP settings valid (not delivery tested)',receivingAddress:'Receiving address format valid',rpcConfigured:'BSC RPC configured',rpcVerified:'BSC RPC mainnet and USDT contract verified'}).map(([key,label])=><li key={key}>{label}: {setup.cryptoReview.checks[key]===true?'OK':setup.cryptoReview.checks[key]===null?'Not checked':'Needs attention'}</li>)}</ul></div>}
    <p className="muted">Run the SMTP, database and BSC diagnostics on your server. Crypto availability depends on deployment prerequisites; test the complete process before accepting funds.</p>
   </div>}
   </div>}
   {activeTab==='payments'&&<div className="admin-tab-content">
   <div className="card luxe-card" style={{marginTop:16,overflowX:'auto'}}><h2>Card payment status</h2><p className="muted">An order needing review must be reconciled with Stripe manually. Never ask the client to pay again without checking.</p>
    {!cardPayments.length?<p>No card orders recorded.</p>:<table><thead><tr><th>Workspace / plan</th><th>Amount</th><th>Provider reference</th><th>Status</th><th>Action</th></tr></thead><tbody>{cardPayments.map(p=><tr key={p._id}><td>{p.organizationId}<br/>{p.plan}</td><td>${p.amount}</td><td>{p.stripeIntentId||'Not yet created'}</td><td>{p.status}{p.stripeReviewReason?` · ${p.stripeReviewReason}`:''}</td><td><button className="btn secondary sm" disabled={!!busy} onClick={()=>checkCard(p)}>Check status</button></td></tr>)}</tbody></table>}
   </div>
   <div className="card luxe-card" style={{marginTop:16,overflowX:'auto'}}><h2>Crypto payment review</h2>
    <p className="muted">Shows up to 100 recent reviews and refreshes every 30 seconds. Verification checks the BNB Chain USDT transaction and requires 64 confirmations. Email alerts are best-effort; failed alerts can be retried.</p>
    {cryptoLocks.length>0&&<div><h3>Open USDT orders</h3><p className="muted">Verify on-chain and investigate before any manual recovery. Do not ask the client to pay again.</p>{cryptoLocks.map(l=><div key={l.orderId} className="block">Workspace: {l.organizationId} · Order: {l.orderId} · {l.status} · Quote expires: {l.expiresAt||'unknown'} {l.cancelRequestedAt&&<b> · Cancellation requested</b>} {' '}{l.status==='pending'&&<button className="btn ghost sm" disabled={!!busy} onClick={()=>resolveLock(l)}>Investigate &amp; close</button>}{l.status==='crypto_rejected'&&<button className="btn ghost sm" disabled={!!busy} onClick={()=>settleRejected(l)}>Reconcile rejected payment</button>}</div>)}</div>}
    {!payments.length?<p>No payment submissions recorded.</p>:<table><thead><tr><th>Workspace / plan</th><th>Amount</th><th>Transaction</th><th>Status / email</th><th>Action</th></tr></thead><tbody>{payments.map(p=><tr key={p.txHash}>
     <td><b>{p.workspaceName||'Workspace'}</b><br/><span className="muted">ID: {p.organizationId}</span><br/>{p.payer ? <>{p.payer.name||'User'} · {p.payer.email||p.payer.id}<br/><span className="muted">User ID: {p.payer.id}</span></> : <span className="muted">User not recorded for this order</span>}<br/><b>{p.kind==='addon'?`${p.code} × ${p.quantity}`:`${p.plan} · ${p.interval||'term'}`}</b></td><td>{p.amount} USDT</td><td><a href={`https://bscscan.com/tx/${p.txHash}`} target="_blank" rel="noreferrer">{p.txHash.slice(0,12)}…{p.txHash.slice(-6)}</a></td><td>{p.status}{p.cancelRequestedAt&&<><br/><b>Cancellation requested</b></>}<br/>Email: {p.notificationStatus}</td>
     <td>{p.status==='pending'&&<button className="btn secondary sm" disabled={!!busy||!!p.cancelRequestedAt} onClick={()=>reviewPayment(p)}>Verify &amp; approve</button>} {p.status==='pending'&&<button className="btn ghost sm" disabled={!!busy} onClick={()=>rejectPayment(p)}>Reject review</button>} <button className="btn ghost sm" disabled={!!busy} onClick={()=>retryAlert(p)}>Retry email</button></td></tr>)}</tbody></table>}
   </div>
   </div>}
   {activeTab==='support'&&<div className="admin-tab-content">
   <div className="card luxe-card" style={{marginTop:16,overflowX:'auto'}}><h2>Contact messages</h2><p className="muted">Recent contact form submissions. Notification delivery may be retried; SMTP acceptance does not guarantee inbox delivery.</p>
    {!contactMessages.length?<p>No contact messages yet.</p>:contactMessages.map(m=><details className="block" key={m.id}><summary><b>{m.name} · {m.topic}</b> <span> · {m.deliveryStatus}</span></summary><p><a href={`mailto:${encodeURIComponent(m.email)}`}>{m.email}</a>{m.company?` · ${m.company}`:''}</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{m.message}</p><small>{m.createdAt?.slice(0,10)} · Ref {m.id.slice(0,8)}</small>{m.deliveryStatus==='failed'&&<p><button className="btn secondary sm" disabled={!!busy} onClick={()=>retryContact(m)}>Retry notification</button></p>}</details>)}
   </div>
   </div>}
   {activeTab==='workspaces'&&<div className="admin-tab-content">
   <div className="card luxe-card" style={{marginTop:16,overflowX:'auto'}}><h2>Workspaces and recent invoices</h2><p className="muted">Showing up to 100 workspaces and 5 recorded invoices per workspace. Refresh for current records.</p>
    <table><thead><tr><th>Workspace</th><th>Owner</th><th>Plan</th><th>Recent invoices</th><th>Action</th></tr></thead><tbody>{spaces.map(w=><tr key={w.id}><td>{w.name}</td><td>{w.owner?.email || '—'}</td><td><b>{w.plan}</b><div className="muted" style={{fontSize:11,marginTop:4}}>{w.planSource || 'legacy'}{w.planExpiresAt ? ` · ends ${new Date(w.planExpiresAt).toLocaleDateString()}` : ''}</div></td><td>{w.invoices.length ? w.invoices.map((i,n)=><div key={n}>{i.number || 'Invoice'} · {i.amount} {i.currency} · {i.status} · {i.date?.slice(0,10)}</div>) : 'No recorded invoices'}</td><td>{editingPlan===w.id?<div style={{display:'grid',gap:8,minWidth:190}}><label htmlFor={`plan-${w.id}`}>New plan</label><select id={`plan-${w.id}`} value={selectedPlan} disabled={!!busy} onChange={e=>setSelectedPlan(e.target.value)}>{plans.map(p=><option key={p.code} value={p.code}>{p.name} · ${p.monthly}/mo</option>)}</select>{selectedPlan!=='free' && <><label htmlFor={`interval-${w.id}`}>Plan term</label><select id={`interval-${w.id}`} value={planInterval} disabled={!!busy} onChange={e=>setPlanInterval(e.target.value)}><option value="month">Monthly · 1 month</option><option value="year">Yearly · 12 months</option></select><label htmlFor={`start-${w.id}`}>Starts (your local time)</label><input id={`start-${w.id}`} type="datetime-local" value={planStart} onChange={e=>setPlanStart(e.target.value)} disabled={!!busy}/><div className="admin-term-preview">Term ends: <b>{termEnd(planStart,planInterval)?.toLocaleString() || 'Choose a start time'}</b><small>Starts immediately; future or already-ended terms cannot be assigned.</small></div></>}<label htmlFor={`reason-${w.id}`}>Reason</label><input id={`reason-${w.id}`} value={planReason} onChange={e=>setPlanReason(e.target.value)} maxLength={500} placeholder="Reason (10+ characters)" disabled={!!busy}/><div><button className="btn sm" disabled={!!busy||planReason.trim().length<10||(selectedPlan!=='free'&&!planStart)} onClick={()=>changePlan(w)}>Save plan</button>{' '}<button className="btn ghost sm" disabled={!!busy} onClick={()=>{setEditingPlan(null);setPlanReason('');}}>Cancel</button></div></div>:<button className="btn secondary sm" disabled={!!busy||!plans.length} onClick={()=>{setEditingPlan(w.id);setPlanSnapshot({...w});setSelectedPlan(w.plan);setPlanReason('');setPlanInterval('month');setPlanStart(localNow());}}>Change plan</button>}</td></tr>)}</tbody></table>
   </div>
   </div>}
   {activeTab==='users'&&<div className="admin-tab-content">
   <div className="card luxe-card" style={{marginTop:16,overflowX:'auto'}}><h2>Users</h2><p className="muted">Page {userPage+1}. Deletion is reversible: the account is disabled, but workspace, billing and audit records are retained. Restoring requires a new login and new API keys.</p><table><thead><tr><th>Name</th><th>Email</th><th>Verified</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.emailVerified?'Yes':'No'}</td><td>{u.status}</td><td>{u.createdAt?.slice(0,10)}</td><td>{u.status!=='active'&&<button className="btn secondary sm" disabled={!!busy} onClick={()=>setUserStatus(u,'active')}>Activate</button>} {u.status==='active'&&<button className="btn secondary sm" disabled={!!busy} onClick={()=>setUserStatus(u,'suspended')}>Suspend</button>} {u.status!=='deleted'&&<button className="btn ghost sm" disabled={!!busy} onClick={()=>setUserStatus(u,'deleted')}>Soft delete</button>}</td></tr>)}</tbody></table><p><button className="btn secondary sm" disabled={userPage===0} onClick={()=>setUserPage(p=>p-1)}>Previous</button>{' '}<button className="btn secondary sm" disabled={users.length<50} onClick={()=>setUserPage(p=>p+1)}>Next</button></p></div>
   </div>}
  </>}
 </>;
}

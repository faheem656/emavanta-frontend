'use client';
import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Modal from '../../../components/Modal';
import CheckoutPanel from '../../../components/CheckoutPanel';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const ASSIGNABLE = ['admin','member','viewer','billing','client'];

export default function Team(){
 const toast = useToast();
 const [members,setMembers] = useState([]);
 const [teams,setTeams] = useState([]);
 const [usage,setUsage] = useState(null);
 const [open,setOpen] = useState(false);
 const [invite,setInvite] = useState({email:'',role:'member'});
 const [perm,setPerm] = useState(null);
 const [sess,setSess] = useState(null); // { member, rows, busy }
 const [inviteLink,setInviteLink] = useState('');
 const [inviteError,setInviteError] = useState('');
 const [inviteTouched,setInviteTouched] = useState(false);
 const [saving,setSaving] = useState('');
 const [checkout,setCheckout] = useState(null);
 const [pendingInvite,setPendingInvite] = useState(null);
 const [loaded,setLoaded] = useState(false);

 const load = () => {
  Promise.allSettled([
   get('/team/members').then(r=>setMembers(Array.isArray(r)?r:[])),
   get('/team/teams').then(r=>setTeams(Array.isArray(r)?r:[])),
   get('/billing/usage').then(r=>setUsage(r))
  ]).then(()=>setLoaded(true));
 };
 useEffect(() => { load(); }, []);

 const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
 const send = async draft => {
  const payload = draft || invite;
  const email = String(payload.email || '').trim().toLowerCase();
  if(!validEmail(email)){
   // stop here — an empty or malformed address must never reach the server
   setInviteError(!email ? 'Enter the email address you want to invite.' : 'That email address is not valid.');
   return;
  }
  setInviteError('');
  setSaving('invite');
  try {
   const r = await post('/team/invite',{ ...payload, email });
   setInviteLink(r.inviteUrl || ''); setOpen(false); setPendingInvite(null); load();
   toast({ title:'Invite created', message:'Share the link below with your teammate.',
     actions:[{label:'Copy link', onClick:()=>navigator.clipboard?.writeText(location.origin + (r.inviteUrl||''))}] });
  } catch(e){
   if(e.limit || e.code === 'SEAT_LIMIT' || /seat limit/i.test(e.message)){
    setPendingInvite(payload);
    toast({ title:'Seat limit reached', level:'warn', message:e.message,
      actions:[{ label:'Buy +5 seats now', onClick:()=>buySeats(payload) }] });
   } else if(e.code === 'ALREADY_MEMBER' || e.code === 'INVITE_PENDING'){
    // both are about the address in the field — keep the message next to it
    setInviteError(e.message);
   } else if(e.code === 'VALIDATION_ERROR' || e.status === 422){
    const field = (e.details?.fields || []).find(f => String(f.path).includes('email'));
    setInviteError(field ? (field.message === 'Required' ? 'Enter the email address you want to invite.' : `That email address is not valid — ${field.message.toLowerCase()}.`)
      : 'Check the email address and role, then try again.');
   } else notify(toast, e);
  }
  finally{ setSaving(''); }
 };

 // Seats are a paid add-on: open the checkout dialog, and only after the payment
 // succeeds re-send the invite that hit the limit.
 const buySeats = draft => {
  setPendingInvite(draft || pendingInvite);
  setCheckout({ kind:'addon', code:'seats5', quantity:1, amount:15, label:'+5 team seats · $15/mo' });
 };
 const seatsPaid = async r => {
  await load();
  const payload = pendingInvite;
  if (payload) {
   toast(`Payment received — ${r?.invoice?.number || 'invoice paid'} · inviting again`);
   setTimeout(() => send(payload), 400);
  }
 };
 const changeRole = async (m, role) => {
  if(m.role === 'owner'){ toast('The workspace owner keeps full control — transfer ownership instead of changing the role','warn'); return; }
  setSaving(m._id);
  try { await patch(`/team/members/${m._id}`,{role}); toast(`Role updated to ${role}`); load(); }
  catch(e){ notify(toast, e); }
  finally{ setSaving(''); }
 };
 const remove = async m => {
  if(m.role === 'owner'){ toast('The owner cannot be removed from their own workspace','warn'); return; }
  if(!window.confirm(`Remove ${m.email || m.name || 'this member'} from this workspace?`))return;
  try { await del(`/team/members/${m._id}`); toast('Member removed'); load(); } catch(e){ notify(toast, e); }
 };

 const seatLimit = usage?.limits?.seats ?? 1;
 const used = usage?.used?.seats ?? members.filter(m=>m.status==='active').length;
 const seatsPct = Math.min(100, Math.round((used/Math.max(seatLimit,1))*100));

  const openSessions = async m => {
  setSess({ member: m, rows: null, busy: true });
  try {
   const r = await get(`/team/members/${m.userId}/sessions`);
   setSess({ member: m, rows: Array.isArray(r) ? r : r.sessions || [], busy: false });
  } catch(e){ notify(toast, e); setSess(null); }
 };
 const killSession = async (m, sid) => {
  try { await del(`/team/members/${m.userId}/sessions/${sid}`); toast('Device signed out'); openSessions(m); }
  catch(e){ notify(toast, e); }
 };
 const killAll = async m => {
  try { const r = await post(`/team/members/${m.userId}/logout`, {});
    toast(r.revoked ? `${m.email} signed out of ${r.revoked} device(s)` : `${m.email} had no active sessions`); openSessions(m); }
  catch(e){ notify(toast, e); }
 };

 if (!loaded) return <DashboardSkeleton variant="table" rows={6} columns={5} />;

 return <>
 <PageHead title="Team & access" subtitle="Roles, invites, shared resources and client scopes"
   actions={<><button className="btn secondary sm" onClick={()=>get('/team/permissions').then(setPerm).catch(e=>notify(toast,e))}>View permissions</button>
    <button className="btn sm" onClick={()=>{setInviteLink('');setInviteError('');setInviteTouched(false);setOpen(true);}}><Icon name="plus" size={15}/> Invite</button></>}/>

  <div className="grid" style={{gridTemplateColumns:'1.6fr 1fr',alignItems:'start'}}>
   <div className="card table-card" style={{padding:18}}>
    <div className="mini-row"><h2 style={{margin:0}}>Members</h2><span className="badge">{members.length}</span></div>
    <table><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Scopes</th><th></th></tr></thead><tbody>
     {members.map(m=><tr key={m._id}>
      <td>
       <div className="row" style={{gap:10}}>
        <span className="avatar" title={m.email}>{m.initials || (m.email||'?').slice(0,2).toUpperCase()}</span>
        <span style={{minWidth:0}}>
         <b style={{display:'block',fontSize:13,textTransform:'capitalize'}}>{m.name || (m.email||'').split('@')[0]}</b>
         <span className="muted" style={{fontSize:11.5}}>{m.email}{m.isYou ? ' · you' : ''}</span>
        </span>
       </div>
      </td>
      <td>
       {m.role === 'owner'
        ? <span className="badge ok"><Icon name="shield" size={11}/> owner</span>
        : <select value={m.role} disabled={saving===m._id} onChange={e=>changeRole(m,e.target.value)}>
            {ASSIGNABLE.map(r=><option key={r}>{r}</option>)}
          </select>}
      </td>
      <td><span className={`badge ${m.status==='active'?'ok':'warn'}`}>{m.status}</span></td>
      <td className="muted">{(m.workspaceScopes||[]).join(', ')||'global'}</td>
      <td>
       <div className="row" style={{gap:4,justifyContent:'flex-end'}}>
        <button className="btn ghost sm" title="Sessions on this account" onClick={()=>openSessions(m)}>
          <Icon name="key" size={12}/> Sessions</button>
        {m.role!=='owner' && <button className="icon-btn sm" title="Remove" onClick={()=>remove(m)}><Icon name="close" size={13}/></button>}
       </div>
      </td>
     </tr>)}
     {!members.length && <tr><td colSpan={5} className="empty">No members yet</td></tr>}
    </tbody></table>
   </div>

   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="card luxe-card">
     <div className="mini-row"><h2 style={{margin:0}}>Seats</h2><span className={`badge ${seatsPct>=100?'danger':'ok'}`}>{used}/{seatLimit>=9999?'∞':seatLimit}</span></div>
     <div className="progress" style={{marginTop:10}}><i style={{width:`${seatsPct}%`}}/></div>
     <p className="muted" style={{marginTop:10,fontSize:12.5}}>
      {seatsPct>=100?'Every seat is in use. Add the +5 seats pack (paid) to invite more people.':'You can still invite ' + Math.max(0,seatLimit-used) + ' teammate(s) on this plan.'}
     </p>
     <button className="btn secondary sm" style={{marginTop:6}} onClick={()=>buySeats()}>
      <Icon name="plus" size={14}/> Buy +5 seats · $15/mo
     </button>
     {seatsPct>=100 && <p className="muted" style={{fontSize:12,marginTop:8}}>
      Seats are full. Adding the pack instantly raises the limit — you can invite right after.
     </p>}
    </div>
    <div className="card luxe-card">
     <h2>Teams</h2>
     {teams.map(t=><div className="block" key={t._id}>{t.name} <span className="muted">· {t.memberIds?.length||0} members</span></div>)}
     {!teams.length&&<p className="muted">No teams yet — teams group members for shared inboxes and scoped assets.</p>}
    </div>
   </div>
  </div>

  {open && <Modal title="Invite teammate" onClose={()=>{ setOpen(false); setInviteError(''); }}
   footer={<><button className="btn secondary" onClick={()=>{ setOpen(false); setInviteError(''); }}>Cancel</button>
    <button className="btn" onClick={()=>send()} disabled={saving==='invite' || !validEmail(invite.email)}>
     {saving==='invite'?'Creating…':'Create invite'}</button></>}>
   <label>Email</label>
   <input style={{width:'100%'}} type="email" inputMode="email" autoComplete="email" value={invite.email}
     className={inviteError ? 'invalid' : ''}
     onChange={e=>{ setInvite({...invite,email:e.target.value}); setInviteError(''); }}
     onBlur={()=>{ setInviteTouched(true);
       const v = String(invite.email||'').trim();
       if(v && !validEmail(v)) setInviteError('That email address is not valid — use name@company.com.'); }}
     onKeyDown={e=>{ if(e.key==='Enter'){ setInviteTouched(true); if(validEmail(invite.email)) send(); else setInviteError(
       String(invite.email||'').trim() ? 'That email address is not valid — use name@company.com.' : 'Enter the email address you want to invite.'); } }}
     placeholder="teammate@company.com"/>
   {inviteError && <span className="field-error" role="alert">{inviteError}</span>}
   {!inviteError && <span className="muted" style={{fontSize:11.5,display:'block',marginTop:4}}>
     {inviteTouched && !String(invite.email||'').trim()
       ? 'Enter the email address you want to invite.'
       : 'We create a single-use invite link — no email is sent from your mailbox.'}</span>}
   <label style={{marginTop:12}}>Role</label>
   <select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value})}>
    {ASSIGNABLE.filter(r=>r!=='client').map(r=><option key={r}>{r}</option>)}</select>
   <div className="notice" style={{marginTop:14}}>
    Invites use {used} of {seatLimit>=0?seatLimit:'∞'} seats.
    {seatsPct>=100 ? ' All seats are taken — buy the +5 seats pack and the invite will be created automatically.' : ''}
   </div>
  </Modal>}

  {inviteLink && <div className="notice ok" style={{marginTop:14}}>
   <b>Invite link</b><div style={{wordBreak:'break-all',fontFamily:'monospace',fontSize:12,marginTop:4}}>{location.origin}{inviteLink}</div>
   <div className="row" style={{marginTop:8}}>
    <button className="btn ghost sm" onClick={()=>navigator.clipboard?.writeText(location.origin+inviteLink).then(()=>toast('Copied'))}>Copy</button>
    <button className="btn ghost sm" onClick={()=>setInviteLink('')}>Dismiss</button>
   </div>
  </div>}

  {sess && <Modal title={`Sessions · ${sess.member.email}`} onClose={()=>setSess(null)}>
   <p className="muted">Every device with a live session for this member. Signing one out ends it immediately — the token stops working on the next request.</p>
   {sess.busy && <div className="pay-loading"><span className="spinner"/></div>}
   {sess.rows && sess.rows.length === 0 && <div className="empty">No active sessions — this member is signed out everywhere.</div>}
   {sess.rows && sess.rows.length > 0 && <div className="sess-list">
    {sess.rows.map(s2=><div className="sess-row" key={s2._id}>
      <span className="sess-icon"><Icon name="key" size={14}/></span>
      <span className="sess-body">
        <b>{s2.label}</b>
        <span className="muted">started {new Date(s2.createdAt).toLocaleString()} · last seen {s2.lastSeenAt ? new Date(s2.lastSeenAt).toLocaleString() : 'just now'}</span>
      </span>
      {s2.current ? <span className="badge">this device</span>
        : <button className="btn ghost sm" onClick={()=>killSession(sess.member, s2._id)}>Sign out</button>}
    </div>)}
   </div>}
   <div className="row" style={{marginTop:14, justifyContent:'flex-end'}}>
    <button className="btn secondary" onClick={()=>setSess(null)}>Close</button>
    <button className="btn" onClick={()=>killAll(sess.member)}><Icon name="logout" size={14}/> Sign out everywhere</button>
   </div>
  </Modal>}

  {perm && <Modal title={`Permissions · ${perm.role}`} onClose={()=>setPerm(null)}>
   <div className="row">{(perm.permissions||[]).map(p=><span className="badge" key={p}>{p}</span>)}</div>
  </Modal>}

  <CheckoutPanel intent={checkout} onClose={()=>setCheckout(null)} onPaid={seatsPaid}/>
 </>;
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const ago = iso => {
 if(!iso) return '—';
 const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
 if(s < 60) return 'just now';
 if(s < 3600) return `${Math.round(s/60)} min ago`;
 if(s < 86400) return `${Math.round(s/3600)} h ago`;
 return `${Math.round(s/86400)} d ago`;
};

export default function Security(){
 const toast = useToast();
 const [audit,setAudit] = useState(null);
 const [sessions,setSessions] = useState([]);
 const [mfa,setMfa] = useState({ enabled:false });
 const [me,setMe] = useState(null);
 const [pw,setPw] = useState({ currentPassword:'', newPassword:'', repeat:'' });
 const [busy,setBusy] = useState('');
 const [showPw,setShowPw] = useState({currentPassword:false,newPassword:false,repeat:false});
 const [tick,setTick] = useState(0);

 const load = () => {
  get('/security/audit/verify').then(r=>{ if(r && !Array.isArray(r)) setAudit(r); }).catch(()=>{});
  get('/security/sessions').then(r=>setSessions(Array.isArray(r)?r:[])).catch(()=>{});
  get('/security/mfa/status').then(r=>{ if(r && !Array.isArray(r)) setMfa(r); }).catch(()=>{});
  get('/auth/me').then(setMe).catch(()=>{});
 };
 useEffect(() => { load(); const t = setInterval(() => setTick(x=>x+1), 15000); return () => clearInterval(t); }, []);

 const canManage = ['owner','admin','super_admin'].includes(me?.role);
 const revoke = async id => {
  try { await del(`/security/sessions/${id}`); toast('Session signed out'); load(); } catch(e){ notify(toast,e); }
 };
 const revokeAll = async () => {
  if(!window.confirm('Sign out every other device? This keeps the device you are using now.'))return;
  setBusy('all');
  try { const r = await del('/security/sessions',{ keepCurrent:true });
   toast(`${r.revoked ?? 0} session(s) signed out`); load();
  } catch(e){ notify(toast,e); } finally{ setBusy(''); }
 };
 const changePassword = async () => {
  if(pw.newPassword !== pw.repeat){ toast('New passwords do not match','warn'); return; }
  setBusy('pw');
  try { const r = await post('/security/password',{currentPassword:pw.currentPassword,newPassword:pw.newPassword});
   toast(`Password updated${r.signedOutOtherDevices?` · ${r.signedOutOtherDevices} other device(s) signed out`:''}`);
   setPw({currentPassword:'',newPassword:'',repeat:''}); load();
  } catch(e){ notify(toast,e); } finally{ setBusy(''); }
 };

 const active = sessions.filter(s=>s.status==='active');
 return <>
  <PageHead title="Security" subtitle="Authenticator, live sessions and the tamper-evident audit chain"
   actions={<Link className="btn sm" href="/dashboard/settings"><Icon name="shield" size={15}/> 2FA &amp; workspace</Link>}/>

  <div className="stat-strip">
   <div className="card luxe-card"><div className="stat-label">Two-factor auth</div>
    <div className="stat" style={{color:mfa.enabled?'#0f9d6e':'#b98118'}}>{mfa.enabled?'On':'Off'}</div>
    <p className="muted">Google Authenticator · TOTP 6-digit · rotates every 30s</p>
    {!mfa.enabled && <Link className="btn ghost sm" href="/dashboard/settings">Enable now</Link>}</div>
   <div className="card luxe-card"><div className="stat-label">Audit chain</div>
    <div className="stat">{audit?.intact?'Intact':'Check'}</div>
    <p className="muted">{audit?.entries||0} entries · sha256 linked, tamper-evident</p></div>
   <div className="card luxe-card"><div className="stat-label">Active sessions</div>
    <div className="stat">{active.length}</div>
    <p className="muted">Live device list · updates every 15s ({tick>0?'refreshing':'auto'})</p></div>
  </div>

  <div className="grid" style={{gridTemplateColumns:'1.5fr 1fr',alignItems:'start',marginTop:16}}>
   <div className="card luxe-card" style={{padding:18}}>
    <div className="mini-row"><div><h2 style={{margin:0}}>Sessions</h2>
      <p className="muted" style={{margin:'4px 0 0'}}>Everyone signed in right now. Owner and admin can sign any device out.</p></div>
     <button className="btn ghost sm" onClick={revokeAll} disabled={!canManage||busy==='all'}>
      <Icon name="shield" size={14}/> {busy==='all'?'Working…':'Sign out others'}</button></div>
    <table style={{marginTop:12}}><thead><tr><th>Device</th><th>IP</th><th>Signed in</th><th>Status</th><th></th></tr></thead><tbody>
     {active.map(s=><tr key={s._id}>
      <td><div className="row" style={{gap:8}}><span className="device-ico"><Icon name="bolt" size={13}/></span>
        <div><b style={{fontSize:12.5}}>{s.device||'Unknown device'}</b>
         <div className="muted" style={{fontSize:11}}>{s.current?'This device':s.role||'member'}</div></div></div></td>
      <td className="muted">{s.ip||'—'}</td>
      <td className="muted">{ago(s.createdAt)}</td>
      <td>{s.current?<span className="badge ok">current</span>:<span className="badge">active</span>}</td>
      <td>{canManage && !s.current && <button className="btn ghost sm" onClick={()=>revoke(s._id)}>Sign out</button>}</td>
     </tr>)}
     {!active.length && <tr><td colSpan={5} className="empty">No active sessions — sign in to see devices here</td></tr>}
    </tbody></table>
    {!canManage && <p className="muted" style={{marginTop:10,fontSize:12}}>Only owners and admins can revoke other sessions.</p>}
   </div>

   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    <form className="card luxe-card security-password" onSubmit={e=>{e.preventDefault();changePassword();}}>
     <div className="security-password-head"><span className="security-lock"><Icon name="key" size={20}/></span><div><span className="security-kicker">ACCOUNT PROTECTION</span><h2>Change password</h2></div></div>
     <p className="security-desc">Keep your account secure with a unique password. Your other sessions will be signed out.</p>
     {[['currentPassword','Current password','current-password','Enter current password'],['newPassword','New password','new-password','At least 10 characters'],['repeat','Confirm new password','new-password','Repeat your new password']].map(([key,label,autocomplete,placeholder])=><div className="security-field" key={key}>
      <label htmlFor={`security-${key}`}>{label}</label><div className="security-input-wrap"><input id={`security-${key}`} type={showPw[key]?'text':'password'} autoComplete={autocomplete} placeholder={placeholder} value={pw[key]} onChange={e=>setPw({...pw,[key]:e.target.value})} required minLength={key==='currentPassword'?undefined:10}/><button type="button" className="security-eye" aria-label={`${showPw[key]?'Hide':'Show'} ${label.toLowerCase()}`} aria-pressed={showPw[key]} onClick={()=>setShowPw(v=>({...v,[key]:!v[key]}))}><Icon name="eye" size={17}/></button></div>
     </div>)}
     <div className="security-rules"><span className={pw.newPassword.length>=10?'valid':''}><Icon name="check" size={13}/> At least 10 characters</span><span className={pw.repeat && pw.repeat===pw.newPassword?'valid':''}><Icon name="check" size={13}/> Passwords match</span></div>
     <button className="btn security-submit" type="submit" disabled={busy==='pw'||!pw.currentPassword||pw.newPassword.length<10||pw.newPassword!==pw.repeat||!!me?.demo}><Icon name="shield" size={16}/>{busy==='pw'?'Updating…':'Update password'} <span>→</span></button>
     {me?.demo && <p className="security-demo">Password changes are disabled in the demo workspace.</p>}
    </form>
    <div className="card luxe-card">
     <h2>Audit chain</h2>
     <p className="muted" style={{fontSize:12.5}}>Each event is hashed with the previous hash, so an edit anywhere breaks the chain.</p>
     <div className="mini-row" style={{marginTop:10}}>
      <span className={`badge ${audit?.intact?'ok':'danger'}`}>{audit?.intact?'verified':'broken'}</span>
      <span className="muted">{audit?.entries||0} entries</span>
     </div>
     {!audit?.intact && canManage && <>
      <p className="muted" style={{fontSize:12,marginTop:8}}>Entries written by an older build used timestamp ordering, which can look broken. Re-linking recomputes the chain in sequence order.</p>
      <button className="btn ghost sm" style={{marginTop:8}} onClick={async()=>{
        try { const r = await post('/security/audit/rechain',{}); toast(`${r.repaired} entr${r.repaired===1?'y':'ies'} re-linked`); load(); }
        catch(e){ notify(toast,e); }
      }}>Re-link chain</button>
     </>}
     <Link className="btn ghost sm" style={{marginTop:10}} href="/dashboard/admin">Open audit log</Link>
    </div>
   </div>
  </div>
 </>;
}

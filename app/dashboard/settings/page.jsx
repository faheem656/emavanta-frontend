'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Modal from '../../../components/Modal';
import QrCode from '../../../components/QrCode';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

export default function Settings(){
 const toast = useToast();
 const [status,setStatus] = useState({ enabled:false, method:'totp' });
 const [setup,setSetup] = useState(null);
 const [code,setCode] = useState('');
 const [disableCode,setDisableCode] = useState('');
 const [org,setOrg] = useState(null);
 const [orgName,setOrgName] = useState('');
 const [delOpen,setDelOpen] = useState(false);
 const [typed,setTyped] = useState('');
 const [deletion,setDeletion] = useState({ status:'active' });
 const [busy,setBusy] = useState('');
 const [copied,setCopied] = useState(false);
 const [countdown,setCountdown] = useState(30);
 const [recovery,setRecovery] = useState([]);

 const [loaded,setLoaded] = useState(false);
 const load = () => {
  Promise.allSettled([
   get('/security/mfa/status').then(r => { if(r && !Array.isArray(r)) setStatus(r); }),
   get('/organizations/current').then(r => { if(r && !Array.isArray(r)){ setOrg(r.organization); setOrgName(r.organization?.name || ''); } }),
   get('/organizations/current/deletion').then(r => { if(r && !Array.isArray(r)) setDeletion(r); })
  ]).then(()=>setLoaded(true));
 };
 useEffect(() => { load(); }, []);
 useEffect(() => {
  const t = setInterval(() => setCountdown(30 - Math.floor((Date.now()/1000) % 30)), 1000);
  setCountdown(30 - Math.floor((Date.now()/1000) % 30));
  return () => clearInterval(t);
 }, []);
 const copyKey = async () => {
  const key = setup?.secret || '';
  try { await navigator.clipboard.writeText(key); setCopied(true); setTimeout(()=>setCopied(false), 1800); }
  catch { toast('Select the key and press Ctrl/Cmd+C to copy','warn'); }
 };

 const start = async () => {
  setBusy('setupauth');
  try { const r = await post('/security/mfa/setup',{}); setSetup(r); }
  catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const verify = async () => {
  setBusy('verify');
  try { const r = await post('/security/mfa/verify',{code});
   setSetup(null); setCode(''); setRecovery(Array.isArray(r?.recoveryCodes) ? r.recoveryCodes : []); load();
   toast({ title:'Two-factor enabled', message:'Your next sign-in will ask for the 6-digit code. Save the recovery codes below.' });
  } catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const disable = async () => {
  try { await post('/security/mfa/disable',{code:disableCode}); setDisableCode(''); load(); toast('Two-factor disabled'); }
  catch(e){ notify(toast,e); }
 };
 const saveOrg = async () => {
  try {
   await patch('/organizations/current',{ settings: { ...(org?.settings||{}), brandName: orgName } });
   toast('Workspace name saved'); load();
  } catch(e){ notify(toast,e); }
 };
 const softDelete = async () => {
  setBusy('delete');
  try { const r = await del('/organizations/current',{ confirmName: typed });
   setDelOpen(false); setTyped(''); setDeletion({ ...deletion, status:'pending_deletion', purgeAt:r.purgeAt });
   toast({ title:'Workspace moved to soft delete', level:'warn',
     message: r.note || `Nothing is erased. You have 30 days to restore. Permanent purge: ${String(r.purgeAt).slice(0,10)}.`,
     actions:[{ label:'Restore now', onClick: restore }] });
   load();
  } catch(e){ notify(toast,e); } finally { setBusy(''); }
 };
 const restore = async () => {
  try { await post('/organizations/current/restore',{}); toast('Workspace restored — nothing was lost'); load(); }
  catch(e){ notify(toast,e); }
 };

 const pending = deletion?.status === 'pending_deletion';
 if (!loaded) return <DashboardSkeleton variant="cards" />;
 return <>
  <PageHead title="Settings" subtitle="Authenticator, workspace controls and data ownership"/>

  {pending && <div className="banner warn">
   <Icon name="shield" size={16}/>
   <div><b>This workspace is in soft delete.</b> Everything is kept frozen — nothing erased.
    {deletion.purgeAt && <> Permanent purge scheduled for <b>{String(deletion.purgeAt).slice(0,10)}</b>.</>}</div>
   <button className="btn sm" onClick={restore}>Restore workspace</button>
  </div>}

  <div className="grid" style={{gridTemplateColumns:'1.05fr .95fr',alignItems:'start'}}>
   <div className="card luxe-card">
    <div className="mini-row"><div><h2 style={{margin:0}}>Two-factor authentication</h2>
      <p className="muted" style={{margin:'4px 0 0'}}>Google Authenticator (or any TOTP app). Codes rotate every 30 seconds.</p></div>
      <span className={`badge ${status.enabled?'ok':'warn'}`}>{status.enabled?'Enabled':'Not enabled'}</span></div>

    {!setup && !status.enabled && <button className="btn" onClick={start} style={{marginTop:16}} disabled={busy==='setupauth'}>
      <Icon name="shield" size={16}/> {busy==='setupauth'?'Generating…':'Set up Google Authenticator'}</button>}

    {setup && <div className="mfa-grid" style={{marginTop:16}}>
      <div className="mfa-qr">
        <QrCode uri={setup.uri} svg={setup.qrSvg} png={setup.qr} size={196}/>
        {!setup.qr && !setup.qrSvg && setup.qrError && (
          <span className="muted" style={{fontSize:11,marginTop:6,textAlign:'center'}}>QR fell back to the setup key below.</span>
        )}
      </div>
      <div>
        <div className="mfa-scan-step"><span className="mfa-step-n">1</span>
          <span>Open <b>Google Authenticator</b> (or Authy / 1Password) and tap <b>+ → Scan a QR code</b>.</span></div>
        <div className="mfa-scan-step"><span className="mfa-step-n">2</span>
          <span>No camera? Tap <b>+ → Enter a setup key</b> and paste the key below — it does exactly the same thing.</span></div>

        <div className="stat-label" style={{marginTop:14}}>Setup key</div>
        <div className="mfa-keyrow">
          <code className="mfa-secret" style={{margin:0}}>{setup.secret}</code>
          <button className="btn ghost sm" onClick={copyKey}><Icon name={copied?'check':'copy'} size={13}/> {copied?'Copied':'Copy key'}</button>
        </div>
        <p className="muted" style={{fontSize:11.5,marginTop:6}}>Account: <b>{setup.account || 'you'}</b> · Issuer <b>Emavanta</b> · 6 digits · time-based (30s)</p>

        <div className="mfa-scan-step"><span className="mfa-step-n">3</span>
          <span>Enter the 6-digit code your app shows. Codes change every 30 seconds — <span className="mfa-countdown">{countdown}s left in this window</span>.</span></div>
        <label style={{marginTop:10}}>6-digit code</label>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
          placeholder="000000"
          onChange={e=>setCode(e.target.value.replace(/\D/g,''))}
          style={{letterSpacing:6, maxWidth:200}}/>
        <div className="row" style={{marginTop:10}}>
          <button className="btn sm" onClick={verify} disabled={code.length!==6||busy==='verify'}>
            {busy==='verify'?'Verifying…':'Verify & enable'}</button>
          <button className="btn ghost sm" onClick={()=>{setSetup(null); setCode('');}}>Cancel</button>
        </div>
      </div>
    </div>}

    {recovery.length > 0 && <div className="recovery-card" style={{marginTop:16}}>
      <div className="mini-row">
        <div><b>Save these recovery codes</b>
          <p className="muted" style={{margin:'3px 0 0',fontSize:12}}>Each one works <b>once</b> if you lose your phone. Keep them somewhere offline — we cannot show them again.</p></div>
        <span className="badge warn">{recovery.length} codes</span>
      </div>
      <div className="recovery-grid">{recovery.map(c => <code key={c}>{c}</code>)}</div>
      <div className="row" style={{marginTop:12}}>
        <button className="btn secondary sm" onClick={async () => {
          try { await navigator.clipboard.writeText(recovery.join('\n')); toast('Recovery codes copied'); }
          catch { toast('Select the codes and copy them manually','warn'); }
        }}><Icon name="copy" size={13}/> Copy all</button>
        <button className="btn ghost sm" onClick={() => {
          const blob = new Blob([`Emavanta recovery codes\nEach code works once.\n\n${recovery.join('\n')}\n`], { type:'text/plain' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a');
          a.href = url; a.download = 'emavanta-recovery-codes.txt'; a.click(); URL.revokeObjectURL(url);
          toast('Downloaded recovery-codes.txt');
        }}><Icon name="download" size={13}/> Download</button>
        <button className="btn ghost sm" onClick={() => setRecovery([])}>I have saved them</button>
      </div>
    </div>}

    {status.enabled && <div className="block" style={{marginTop:16}}>
      <p className="muted">Authenticator is active on this account. To turn it off, enter a current code.</p>
      <p className="muted" style={{fontSize:12}}>
        Recovery codes left: <b>{status.recoveryCodesLeft ?? 0}</b>
        {status.recoveryCodesLeft === 0 && <> — you have none left. Turn 2FA off and on again to mint a fresh set.</>}
      </p>
      <div className="row"><input inputMode="numeric" maxLength={6} placeholder="000000" value={disableCode}
        onChange={e=>setDisableCode(e.target.value.replace(/\D/g,''))} style={{maxWidth:160,letterSpacing:6}}/>
       <button className="btn ghost sm" onClick={disable} disabled={disableCode.length!==6}>Disable 2FA</button></div>
     </div>}
   </div>

   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="card luxe-card">
     <h2>Workspace</h2>
     <label>Workspace name</label>
     <input style={{width:'100%'}} value={orgName} onChange={e=>setOrgName(e.target.value)}/>
     <p className="muted" style={{fontSize:12}}>Signed in as {org?.plan ? <b>{org.plan}</b> : 'member'} · <Link href="/dashboard/team">manage team</Link></p>
     <button className="btn secondary sm" style={{marginTop:10}} onClick={saveOrg}><Icon name="check" size={14}/> Save</button>
    </div>

    <div className="card luxe-card">
     <h2>Data controls</h2>
     <p className="muted" style={{fontSize:12.5}}>Export everything any time. Deleting is a <b>soft delete</b> — details below.</p>
     <div className="row" style={{marginTop:12}}>
      <button className="btn secondary sm" onClick={()=>get('/data/export').then(r=>toast(`Export queued · job ${r.jobId||'new'}`)).catch(e=>notify(toast,e))}>
       <Icon name="download" size={15}/> Export data</button>
      <button className="btn ghost sm danger-text" onClick={()=>setDelOpen(true)} disabled={pending}>
       {pending?'Awaiting purge':'Delete workspace'}</button>
     </div>
     <div className="notice" style={{marginTop:12}}>
      <b>Soft delete, always.</b> Your workspace is frozen and hidden, data is kept for 30 days, and you can restore it yourself in one click. Permanent deletion only happens after that window.
     </div>
    </div>

    <div className="card luxe-card">
     <h2>Appearance</h2><p className="muted">Light theme with navy &amp; champagne accents, consistent across site and dashboard.</p>
     <div className="row" style={{marginTop:10}}><span className="chip">☀ Light</span><span className="chip">Navy</span><span className="chip">Gold</span></div>
    </div>
   </div>
  </div>

  {delOpen && <Modal title="Delete workspace" onClose={()=>setDelOpen(false)}
   footer={<><button className="btn secondary" onClick={()=>setDelOpen(false)}>Cancel</button>
    <button className="btn danger" onClick={softDelete} disabled={typed!==(org?.name||'')||busy==='delete'}>
     {busy==='delete'?'Moving…':'Move to soft delete'}</button></>}>
   <div className="notice warn"><b>This is a soft delete.</b> Nothing is erased today. The workspace is frozen and restorable for 30 days, then permanently purged.</div>
   <p className="muted" style={{marginTop:12}}>Type <b>{org?.name||'your workspace name'}</b> to confirm.</p>
   <input style={{width:'100%'}} value={typed} onChange={e=>setTyped(e.target.value)} placeholder={org?.name||'workspace name'}/>
   <ul className="muted" style={{fontSize:12.5,marginTop:12,paddingLeft:18}}>
    <li>Sending and automations stop immediately.</li>
    <li>All contacts, campaigns and logs are retained.</li>
    <li>Restore with one click any time within 30 days.</li>
   </ul>
  </Modal>}
 </>;
}

'use client';
import { Fragment, useEffect, useState } from 'react';
import { get, post, del } from '../lib/api';
import { useToast } from './ToastProvider';
import { notify } from '../lib/notify';
import Icon from './Icon';
import Modal from './Modal';

const METHOD_LABEL = { smtp:'SMTP', esp_api:'ESP API key', google:'Google OAuth', microsoft:'Microsoft OAuth' };
const TRACK_LABEL = { hostinger:'Hostinger', webhook:'Custom webhook', imap:'IMAP', pop3:'POP3', mailapi:'Mail API' };
const TRACK_HELP = {
  hostinger: 'Paste the Mail API token from hPanel → Agentic Mail → API access (permissions: SMTP/IMAP actions + Manage webhooks). We verify the token and REGISTER THE WEBHOOK OURSELVES — no URL to copy, no "publicly accessible HTTPS endpoint" to set up by hand.',
  webhook: 'Your provider POSTs signed bounce/complaint events to a URL we give you after saving. Use for any ESP or self-hosted system that can sign payloads (HMAC-SHA256).',
  imap: 'We poll this mailbox for bounce (DSN) messages. Works with any mailbox that has IMAP enabled.',
  pop3: 'We poll this mailbox over POP3 for bounce messages. Use when IMAP is unavailable.',
  mailapi: 'We poll the provider REST API for hard-bounce lists. Needs an API key with bounce read access.'
};
const PRESETS = {
  gmail:   { label:'Gmail / Workspace', host:'smtp.gmail.com', port:587, imap:'imap.gmail.com', pop:'pop.gmail.com', note:'Use a 16-character App Password (Google Account → Security → App passwords).' },
  outlook: { label:'Outlook / Microsoft 365', host:'smtp.office365.com', port:587, imap:'outlook.office365.com', pop:'outlook.office365.com', note:'Use an app password if your tenant requires modern auth.' },
  custom:  { label:'Custom domain', host:'', port:587, imap:'', pop:'', note:'Any SMTP server that accepts username + password.' }
};

const copy = async (text, toast) => {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Copy failed — select and copy manually'); }
};

/** Shared channel fields — used when connecting AND when updating a mailbox. */
function TrackingFields({ method, cfg, setCfg }) {
  if (method === 'hostinger') return <>
    <div className="notice" style={{marginTop:10}}>
      <b>Hostinger (hMail):</b> {TRACK_HELP.hostinger}<br/>
      Create the token: open <b>hPanel → Emails → your domain → Agentic Mail → API access → Create token</b>,
      scope it to the sending mailbox, tick <b>SMTP/IMAP actions</b> + <b>Manage webhooks</b>, copy it (shown once).
    </div>
    <label style={{marginTop:10,display:'block'}}>Mail API token</label>
    <input type="password" autoComplete="new-password" value={cfg.token||''}
      onChange={e=>setCfg({...cfg,token:e.target.value})}
      placeholder="paste the token from Agentic Mail → API access"/>
    <div className="muted" style={{fontSize:11.5,marginTop:6}}>
      The token is encrypted at rest. During the test we call <code>GET /me</code>, provision the
      <code>message.received</code> webhook against your public URL, and store the one-time delivery secret —
      events arrive as <code>Authorization: Bearer &lt;secret&gt;</code>.
    </div>
  </>;
  if (method === 'webhook') return <>
    <div className="notice" style={{marginTop:10}}>
      <b>Webhook:</b> {TRACK_HELP.webhook}<br/>
      A signing secret is generated automatically if left empty — the exact URL and secret are shown on the mailbox row after saving.
    </div>
    <label style={{marginTop:10,display:'block'}}>Signing secret (optional — one is generated when empty)</label>
    <input autoComplete="off" value={cfg.secret||''} onChange={e=>setCfg({...cfg,secret:e.target.value})}
      placeholder="min16 characters — same secret is verified at the provider"/>
  </>;
  if (method === 'imap' || method === 'pop3') return <>
    <div className="grid" style={{gridTemplateColumns:'2fr 1fr',marginTop:10}}>
      <div><label>{method.toUpperCase()} host</label>
        <input value={cfg.host||''} onChange={e=>setCfg({...cfg,host:e.target.value})}
          placeholder={method==='imap'?'imap.yourdomain.com':'pop.yourdomain.com'}/></div>
      <div><label>Port</label>
        <input type="number" value={cfg.port||''} onChange={e=>setCfg({...cfg,port:e.target.value})}
          placeholder={method==='imap'?'993':'995'}/></div>
    </div>
    <div className="grid" style={{gridTemplateColumns:'1fr 1fr',marginTop:10}}>
      <div><label>Username / email</label>
        <input autoComplete="off" value={cfg.user||''} onChange={e=>setCfg({...cfg,user:e.target.value})}
          placeholder="you@yourdomain.com"/></div>
      <div><label>Password or app password</label>
        <input type="password" autoComplete="new-password" value={cfg.pass||''}
          onChange={e=>setCfg({...cfg,pass:e.target.value})} placeholder="••••••••"/></div>
    </div>
    <div className="notice" style={{marginTop:10}}><b>{TRACK_LABEL[method]}:</b> {TRACK_HELP[method]} We log in during the test below — the mailbox must be added only after it passes.</div>
  </>;
  return <>
    <div className="grid" style={{gridTemplateColumns:'1fr 1fr',marginTop:10}}>
      <div><label>Provider</label>
        <select value={cfg.provider||'sendgrid'} onChange={e=>setCfg({...cfg,provider:e.target.value})}>
          {['sendgrid','mailgun','postmark'].map(p=><option key={p}>{p}</option>)}</select></div>
      <div>{(cfg.provider||'sendgrid')==='mailgun'
        ? <><label>Sending domain</label>
            <input value={cfg.domain||''} onChange={e=>setCfg({...cfg,domain:e.target.value})} placeholder="mail.yourdomain.com"/></>
        : <><label>&nbsp;</label>
            <div className="muted" style={{fontSize:12,paddingTop:8}}>Bounces are read with this key during the test.</div></>}</div>
    </div>
    <label style={{marginTop:10,display:'block'}}>API key</label>
    <input type="password" autoComplete="new-password" value={cfg.apiKey||''}
      onChange={e=>setCfg({...cfg,apiKey:e.target.value})}
      placeholder={cfg.provider==='postmark'?'POSTMARK-API-KEY':cfg.provider==='mailgun'?'key-xxxxxxxx':'SG.xxxxx'}/>
    <div className="notice" style={{marginTop:10}}><b>Mail API:</b> {TRACK_HELP.mailapi} The key is encrypted at rest.</div>
  </>;
}

export default function AccountConnector() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [method, setMethod] = useState('smtp');
  const [preset, setPreset] = useState('gmail');
  const [form, setForm] = useState({ fromEmail:'', fromName:'', dailyCap:50, stream:'outreach' });
  const [creds, setCreds] = useState({ host:'smtp.gmail.com', port:587, secure:false, user:'', pass:'' });
  const [esp, setEsp] = useState({ provider:'sendgrid', apiKey:'', domain:'' });
  const [trackMethod, setTrackMethod] = useState('webhook');
  const [trackCfg, setTrackCfg] = useState({ imap:{ host:'imap.gmail.com', port:993, user:'', pass:'' },
    pop3:{ host:'pop.gmail.com', port:995, user:'', pass:'' }, mailapi:{ provider:'sendgrid', apiKey:'', domain:'' },
    webhook:{}, hostinger:{ token:'' } });
  const [busy, setBusy] = useState('');
  const [testing, setTesting] = useState('');
  const [trackTesting, setTrackTesting] = useState('');
  const [editTrack, setEditTrack] = useState('');           // account id being reconfigured
  const [editCfg, setEditCfg] = useState(null);             // { method, ...fields }
  const [reconId, setReconId] = useState('');
  const [reconPass, setReconPass] = useState('');
  const [reconBusy, setReconBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);       // account pending disconnect
  const [showWebhook, setShowWebhook] = useState('');       // account id with webhook details open

  const load = () => get('/accounts').then(r => setAccounts(Array.isArray(r) ? r : []));
  useEffect(() => { load(); }, []);

  const applyPreset = key => {
    setPreset(key);
    const p = PRESETS[key];
    setCreds(c => ({ ...c, host: p.host, port: p.port }));
    setTrackCfg(t => ({ ...t,
      imap: { ...t.imap, host: p.imap || t.imap.host },
      pop3: { ...t.pop3, host: p.pop || t.pop3.host } }));
  };

  // Same-domain recommendation: another mailbox on this domain already reports
  // events through a verified channel → offer it (the better-proven path).
  const domain = String(form.fromEmail||'').split('@')[1]?.toLowerCase() || '';
  const domainSource = domain ? accounts.find(a =>
    String(a.fromEmail||'').split('@')[1]?.toLowerCase()===domain && a.tracking?.status==='verified') : null;
  const recommendation = domainSource?.tracking?.method && domainSource.tracking.method!==trackMethod
    ? { method: domainSource.tracking.method, email: domainSource.fromEmail } : null;
  const applyRecommendation = () => {
    setTrackMethod(recommendation.method);
    if (recommendation.method==='imap' || recommendation.method==='pop3') {
      const p = PRESETS[preset];
      setTrackCfg(t => ({ ...t, [recommendation.method]: {
        ...t[recommendation.method], host: (recommendation.method==='imap'?p.imap:p.pop) || t[recommendation.method].host,
        user: creds.user || t[recommendation.method].user } }));
    }
    toast({ title:'Tracking channel applied', message:`Using ${TRACK_LABEL[recommendation.method]} — already verified on ${recommendation.email}.` });
  };

  const trackingPayload = () => {
    if (trackMethod==='webhook') return { method:'webhook', ...(trackCfg.webhook?.secret?{secret:trackCfg.webhook.secret}:{}) };
    if (trackMethod==='mailapi') return { method:'mailapi', ...trackCfg.mailapi };
    if (trackMethod==='hostinger') return { method:'hostinger', token:(trackCfg.hostinger?.token||'').trim() };
    return { method:trackMethod, ...trackCfg[trackMethod] };
  };
  const trackingReady = () => {
    if (trackMethod==='webhook') return true; // secret auto-generated
    if (trackMethod==='hostinger') return (trackCfg.hostinger?.token||'').trim().length>=16;
    if (trackMethod==='mailapi') return !!(trackCfg.mailapi.apiKey && (trackCfg.mailapi.provider!=='mailgun'||trackCfg.mailapi.domain));
    const c = trackCfg[trackMethod];
    return !!(c.host && c.user && c.pass);
  };

  const oauth = async provider => {
    try {
      const r = await post('/accounts/oauth/start', { provider });
      toast({ title:`${provider === 'google' ? 'Google' : 'Microsoft'} sign-in`, message:'OAuth window opened — approve access, then return here.', actions:[{ label:'Open', href:r.url }] });
      window.open(r.url, '_blank', 'noopener');
    } catch (e) { notify(toast, e); }
  };

  const connect = async () => {
    setBusy('connect');
    try {
      const payload = method === 'smtp'
        ? { method, ...form, credentials: { ...creds, port:Number(creds.port), secure:Number(creds.port) === 465 } }
        : method === 'esp_api' ? { method, ...form, credentials: esp }
        : { method:'mock', ...form, credentials:{} };
      payload.tracking = trackingPayload();
      const r = await post('/accounts/connect', payload);
      toast({ title:'Mailbox added', message:r.next || 'Credentials and tracking channel both verified.' });
      setCreds(c => ({ ...c, user:'', pass:'' })); setEsp({ ...esp, apiKey:'' });
      setTrackCfg(t => ({ ...t, imap:{...t.imap,user:'',pass:''}, pop3:{...t.pop3,user:'',pass:''}, mailapi:{...t.mailapi,apiKey:''}, hostinger:{ token:'' } }));
      load();
    } catch (e) { notify(toast, e); }
    finally { setBusy(''); }
  };

  const test = async a => {
    setTesting(a._id);
    try { await post(`/accounts/${a._id}/test`, { to:a.fromEmail }); toast('Test email accepted by the server'); load(); }
    catch (e) { notify(toast, e); } finally { setTesting(''); }
  };

  const testTracking = async a => {
    setTrackTesting(a._id);
    try { const r = await post(`/accounts/${a._id}/tracking/test`, {}); toast(r?.message || 'Tracking channel verified'); load(); }
    catch (e) { notify(toast, e); } finally { setTrackTesting(''); }
  };

  const startEditTracking = a => {
    setEditTrack(a._id);
    setEditCfg({ method: a.tracking?.method || 'webhook',
      ...(a.tracking?.method==='webhook' ? { secret: a.tracking?.secret || '' } : {}),
      ...(a.tracking?.method==='hostinger' ? { token:'' } : {}),
      ...(a.tracking?.method==='imap'||a.tracking?.method==='pop3' ? { host:'', port:'', user:'', pass:'' } : {}),
      ...(a.tracking?.method==='mailapi' ? { provider:'sendgrid', apiKey:'', domain:'' } : {}) });
  };
  const saveEditTracking = async a => {
    setTrackTesting(a._id);
    try {
      const { method:m, ...cfg } = editCfg;
      const r = await post(`/accounts/${a._id}/tracking`, { tracking: { method:m, ...cfg } });
      toast(r?.message || 'Tracking channel updated'); setEditTrack(''); load();
    } catch (e) { notify(toast, e); } finally { setTrackTesting(''); }
  };

  const disconnect = async a => {
    try { await del(`/accounts/${a._id}`); toast('Account disconnected'); setConfirmDel(null); load(); }
    catch (e) { notify(toast, e); }
  };

  // Auth failures (535) put the mailbox in "reauth required": paste the new
  // password, we verify it against the server live, then sending resumes by itself.
  const reconnect = async () => {
    setReconBusy(true);
    try {
      const r = await post(`/accounts/${reconId}/reconnect`, { pass: reconPass });
      toast(r?.message || 'Mailbox reconnected — sending resumes automatically');
      setReconId(''); setReconPass(''); load();
    } catch (e) { notify(toast, e); } finally { setReconBusy(false); }
  };

  const active = accounts.filter(a => a.status === 'active').length;
  const webhookBase = typeof window!=='undefined' ? window.location.origin : '';

  return <>
    <div className="card luxe-card">
      <div className="mini-row">
        <div><h2 style={{ margin:0 }}>Connect a sending account</h2>
          <p className="muted" style={{ margin:'4px 0 0' }}>You send from your own mailbox. Credentials are encrypted at rest. Every mailbox must also report bounces through one tested tracking channel.</p></div>
        <span className="badge ok">{active} active</span>
      </div>

      <div className="method-tabs">
        <button className={method === 'smtp' ? 'active' : ''} onClick={() => setMethod('smtp')}><Icon name="mail" size={14}/> SMTP</button>
        <button className={method === 'esp_api' ? 'active' : ''} onClick={() => setMethod('esp_api')}><Icon name="bolt" size={14}/> ESP API key</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', marginTop:14 }}>
        <div><label>From address</label>
          <input placeholder="you@yourdomain.com" value={form.fromEmail} onChange={e => setForm({ ...form, fromEmail:e.target.value })}/></div>
        <div><label>Display name</label>
          <input placeholder="Your name" value={form.fromName} onChange={e => setForm({ ...form, fromName:e.target.value })}/></div>
      </div>

      {method === 'smtp' && <>
        <label style={{ marginTop:12 }}>Provider preset</label>
        <div className="row" style={{ gap:8 }}>
          {Object.entries(PRESETS).map(([k, v]) => <button key={k} className={`chip ${preset === k ? 'chip-active' : ''}`} onClick={() => applyPreset(k)}>{v.label}</button>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns:'2fr 1fr', marginTop:12 }}>
          <div><label>SMTP host</label><input value={creds.host} onChange={e => setCreds({ ...creds, host:e.target.value })} placeholder="smtp.yourdomain.com"/></div>
          <div><label>Port</label><input type="number" value={creds.port} onChange={e => setCreds({ ...creds, port:e.target.value })}/></div>
        </div>
        <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', marginTop:12 }}>
          <div><label>Username / email</label><input autoComplete="off" value={creds.user} onChange={e => setCreds({ ...creds, user:e.target.value })} placeholder="you@yourdomain.com"/></div>
          <div><label>Password or app password</label><input type="password" autoComplete="new-password" value={creds.pass} onChange={e => setCreds({ ...creds, pass:e.target.value })} placeholder="••••••••"/></div>
        </div>
        <div className="notice" style={{ marginTop:12 }}><b>{PRESETS[preset].label}:</b> {PRESETS[preset].note}</div>
        <label className="check-row"><input type="checkbox" checked={!!creds.skipTest} onChange={e => setCreds({ ...creds, skipTest:e.target.checked })}/>
          Save now and test the connection later (account stays <b>pending verification</b> until it passes)</label>
      </>}

      {method === 'esp_api' && <>
        <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', marginTop:12 }}>
          <div><label>Provider</label><select value={esp.provider} onChange={e => setEsp({ ...esp, provider:e.target.value })}>
            {['sendgrid','mailgun','postmark','ses','resend','custom'].map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label>Sending domain</label><input value={esp.domain} onChange={e => setEsp({ ...esp, domain:e.target.value })} placeholder="mail.yourdomain.com"/></div>
        </div>
        <label style={{ marginTop:12 }}>API key</label>
        <input type="password" autoComplete="new-password" value={esp.apiKey} onChange={e => setEsp({ ...esp, apiKey:e.target.value })} placeholder="SG.xxxxx"/>
        <div className="notice" style={{ marginTop:12 }}>The key is encrypted immediately. We only use it to send the mail you schedule.</div>
      </>}

      {/* ── Event tracking (mandatory, test-before-add) ── */}
      <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--border)'}}>
        <div className="mini-row">
          <div><h3 style={{margin:0,fontSize:15}}>Event tracking <span className="badge warn" style={{marginLeft:6}}>required</span></h3>
            <p className="muted" style={{margin:'4px 0 0',fontSize:12}}>How this mailbox reports bounces &amp; complaints. Pick one — it is <b>tested live</b>, and the mailbox is only added if the test passes.</p></div>
        </div>
        <div className="row" style={{gap:8,marginTop:10,flexWrap:'wrap'}}>
          {Object.entries(TRACK_LABEL).map(([k,l]) =>
            <button key={k} className={`chip ${trackMethod===k?'chip-active':''}`} onClick={()=>setTrackMethod(k)}>{l}</button>)}
        </div>
        {recommendation && <div className="notice" style={{marginTop:10}}>
          <b>Recommended for {domain}:</b> <b>{TRACK_LABEL[recommendation.method]}</b> is already verified on {recommendation.email} —
          the proven channel for this domain. <button className="btn sm" style={{marginLeft:8}} onClick={applyRecommendation}>Use {TRACK_LABEL[recommendation.method]}</button>
        </div>}
        <TrackingFields method={trackMethod} cfg={trackCfg[trackMethod]||trackCfg.webhook} setCfg={c=>setTrackCfg(t=>({...t,[trackMethod]:c}))}/>
      </div>

      <div className="row" style={{ marginTop:16, justifyContent:'space-between' }}>
        <span className="muted" style={{ fontSize:12 }}>We never provide mailboxes, IPs or domains — your reputation stays yours.</span>
        <button className="btn" onClick={connect} disabled={busy === 'connect' || !trackingReady()}>
          {busy === 'connect' ? 'Testing credentials + tracking…' : 'Test & add mailbox'}</button>
      </div>
      {!trackingReady() && <p className="muted" style={{ marginTop:8, fontSize:12 }}>Complete the {TRACK_LABEL[trackMethod]} tracking fields to run the test.</p>}
      {busy === 'connect' && method === 'smtp' && <p className="muted" style={{ marginTop:8, fontSize:12 }}>Opening a real connection to {creds.host}:{creds.port} and verifying {TRACK_LABEL[trackMethod]} tracking…</p>}
    </div>

    <div className="card table-card" style={{ marginTop:16, padding:18 }}>
      <div className="mini-row"><h2 style={{ margin:0 }}>Connected accounts</h2><span className="badge">{accounts.length}</span></div>
      <table><thead><tr><th>From</th><th>Method</th><th>Tracking</th><th>Status</th><th></th></tr></thead><tbody>
        {accounts.map(a => <Fragment key={a._id}>
          <tr>
          <td><div><b style={{ fontSize:13 }}>{a.fromEmail}</b><div className="muted" style={{ fontSize:11 }}>{a.fromName || a.smtpHost || '—'}</div></div></td>
          <td>{METHOD_LABEL[a.authMethod] || a.authMethod}</td>
          <td>{a.tracking
            ? <div className="row" style={{gap:6,alignItems:'center'}}>
               <span className={`badge ${a.tracking.status==='verified'?'ok':'warn'}`}>{TRACK_LABEL[a.tracking.method]||a.tracking.method}</span>
               <span className="muted" style={{fontSize:11}}>
                 {a.tracking.lastPolledAt ? `polled ${new Date(a.tracking.lastPolledAt).toLocaleTimeString()}`
                   : a.tracking.lastTestAt ? `tested ${new Date(a.tracking.lastTestAt).toLocaleTimeString()}` : ''}
               </span>
               {a.tracking.lastError && <span className="muted" style={{fontSize:11,color:'#b45309'}} title={a.tracking.lastError}>⚠</span>}
              </div>
            : <span className="badge danger">not set</span>}
          </td>
          <td><span className={`badge ${a.status === 'active' ? 'ok' : ['error','reauth_required','revoked'].includes(a.status) ? 'danger' : 'warn'}`}>{a.status.replace(/_/g, ' ')}</span>
            {a.lastError && <div className="muted" style={{ fontSize: 11, maxWidth:260 }}>{a.lastError}</div>}
            {a.status === 'limited' && a.limitedUntil && Date.parse(a.limitedUntil) > Date.now() &&
              <div className="muted" style={{ fontSize: 11 }}>resumes automatically at {new Date(a.limitedUntil).toLocaleTimeString()}</div>}</td>
          <td className="row" style={{ gap:6, flexWrap:'wrap' }}>
            {a.status === 'reauth_required' && a.authMethod === 'smtp' && reconId === a._id ? <>
              <input type="password" autoComplete="new-password" placeholder="New password / app password"
                value={reconPass} onChange={e => setReconPass(e.target.value)} style={{ width:170, fontSize:12 }} />
              <button className="btn sm" disabled={!reconPass || reconBusy} onClick={reconnect}>
                {reconBusy ? 'Verifying…' : 'Save & verify'}</button>
            </> : <>
              <button className="btn secondary sm" onClick={() => test(a)} disabled={testing === a._id}>
                {testing === a._id ? 'Sending…' : 'Send test'}</button>
              {a.tracking && <button className="btn secondary sm" onClick={() => testTracking(a)} disabled={trackTesting === a._id}>
                {trackTesting === a._id ? 'Testing…' : 'Test tracking'}</button>}
              {(a.tracking?.method==='webhook'||a.tracking?.method==='hostinger') && <button className="btn ghost sm" onClick={()=>setShowWebhook(showWebhook===a._id?'':a._id)}>Webhook URL</button>}
              <button className="btn ghost sm" onClick={() => startEditTracking(a)}>Update tracking</button>
              {a.status === 'reauth_required' && a.authMethod === 'smtp' &&
                <button className="btn sm" onClick={() => { setReconId(a._id); setReconPass(''); }}>Reconnect</button>}
              <button className="btn ghost sm" onClick={() => setConfirmDel(a)}>Disconnect</button>
            </>}
          </td>
          </tr>
          {showWebhook===a._id && a.tracking?.webhookPath && <tr><td colSpan={5} style={{background:'var(--surface)'}}>
            <div className="row" style={{gap:8,alignItems:'center',flexWrap:'wrap'}}>
             <div style={{flex:'1 1 380px'}}><div className="muted" style={{fontSize:11}}>{a.tracking.method==='hostinger'?'Inbound webhook URL (registered automatically at Hostinger)':'Webhook URL — paste at your provider'}</div>
              <code style={{fontSize:11.5,wordBreak:'break-all'}}>{webhookBase}{a.tracking.webhookPath}</code></div>
             <div style={{flex:'1 1 240px'}}><div className="muted" style={{fontSize:11}}>{a.tracking.method==='hostinger'?'Delivery secret (Bearer)':'Signing secret'}</div>
              <code style={{fontSize:11.5,wordBreak:'break-all'}}>{a.tracking.secret||'—'}</code></div>
             <button className="btn secondary sm" onClick={()=>copy(`${webhookBase}${a.tracking.webhookPath}`, toast)}>Copy URL</button>
             <button className="btn secondary sm" onClick={()=>copy(a.tracking.secret||'', toast)}>Copy secret</button>
            </div>
            <div className="muted" style={{fontSize:11,marginTop:6}}>{a.tracking.method==='hostinger'
              ? <>Hostinger hMail POSTs <code>message.received</code> to this URL with <code>Authorization: Bearer &lt;secret&gt;</code> — no manual setup needed; it was provisioned by us via the Mail API.</>
              : <>Provider must sign each payload with HMAC-SHA256 (hex) using this secret in the <code>x-webhook-signature</code> header. A failed test never removes the mailbox.</>}</div>
          </td></tr>}
          {editTrack===a._id && <tr><td colSpan={5} style={{background:'var(--surface)'}}>
            <div className="row" style={{gap:8,flexWrap:'wrap',alignItems:'center'}}>
             {Object.entries(TRACK_LABEL).map(([k,l]) =>
              <button key={k} className={`chip ${editCfg?.method===k?'chip-active':''}`}
               onClick={()=>setEditCfg(c=>({method:k,...(k==='webhook'?{secret:c?.secret||''}:k==='hostinger'?{token:''}:k==='mailapi'?{provider:'sendgrid',apiKey:'',domain:''}:{host:'',port:'',user:'',pass:''})}))}>{l}</button>)}
            </div>
            <TrackingFields method={editCfg?.method||'webhook'} cfg={editCfg||{}} setCfg={c=>setEditCfg(c)}/>
            <div className="row" style={{gap:8,marginTop:10}}>
             <button className="btn sm" disabled={trackTesting===a._id} onClick={()=>saveEditTracking(a)}>
              {trackTesting===a._id?'Testing…':'Test & save channel'}</button>
             <button className="btn ghost sm" onClick={()=>setEditTrack('')}>Cancel</button>
             <span className="muted" style={{fontSize:11}}>IMAP/POP3/Mail-API/Hostinger: re-enter credentials or token (encrypted, never shown) — switching away from Hostinger deletes its webhook. Webhook: keep or paste a new secret.</span>
            </div>
          </td></tr>}
        </Fragment>)}
        {!accounts.length && <tr><td colSpan={5} className="empty">No accounts connected yet</td></tr>}
      </tbody></table>
    </div>

    {confirmDel && <Modal title={`Disconnect ${confirmDel.fromEmail}?`} onClose={()=>setConfirmDel(null)}
      footer={<>
        <button className="btn" onClick={()=>setConfirmDel(null)}>Cancel</button>
        <button className="btn btn-primary" onClick={()=>disconnect(confirmDel)}>Disconnect mailbox</button></>}>
      <p style={{fontSize:13,lineHeight:1.6}}>Campaigns using this mailbox will pause. Contacts, events and suppressions are kept. You can reconnect later.</p>
    </Modal>}
  </>;
}


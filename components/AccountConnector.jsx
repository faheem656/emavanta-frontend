'use client';
import { useEffect, useState } from 'react';
import { get, post, del } from '../lib/api';
import { useToast } from './ToastProvider';
import { notify } from '../lib/notify';
import Icon from './Icon';

const METHOD_LABEL = { smtp:'SMTP / IMAP', esp_api:'ESP API key', google:'Google OAuth', microsoft:'Microsoft OAuth' };
const PRESETS = {
 gmail:   { label:'Gmail / Workspace', host:'smtp.gmail.com', port:587, note:'Use a 16-character App Password (Google Account → Security → App passwords).' },
 outlook: { label:'Outlook / Microsoft 365', host:'smtp.office365.com', port:587, note:'Use an app password if your tenant requires modern auth.' },
 custom:  { label:'Custom domain', host:'', port:587, note:'Any SMTP server that accepts username + password.' }
};

export default function AccountConnector() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [method, setMethod] = useState('smtp');
  const [preset, setPreset] = useState('gmail');
  const [form, setForm] = useState({ fromEmail:'', fromName:'', dailyCap:50, stream:'outreach' });
  const [creds, setCreds] = useState({ host:'smtp.gmail.com', port:587, secure:false, user:'', pass:'' });
  const [esp, setEsp] = useState({ provider:'sendgrid', apiKey:'', domain:'' });
  const [busy, setBusy] = useState('');
  const [testing, setTesting] = useState('');

  const load = () => get('/accounts').then(r => setAccounts(Array.isArray(r) ? r : []));
  useEffect(() => { load(); }, []);

  const applyPreset = key => {
    setPreset(key);
    const p = PRESETS[key];
    setCreds(c => ({ ...c, host: p.host, port: p.port }));
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
      const r = await post('/accounts/connect', payload);
      toast({ title:'Credentials accepted', message:r.next || 'Mailbox connected.' });
      setCreds(c => ({ ...c, user:'', pass:'' })); setEsp({ ...esp, apiKey:'' });
      load();
    } catch (e) { notify(toast, e); }
    finally { setBusy(''); }
  };

  const test = async a => {
    setTesting(a._id);
    try { await post(`/accounts/${a._id}/test`, { to:a.fromEmail }); toast('Test email accepted by the server'); load(); }
    catch (e) { notify(toast, e); } finally { setTesting(''); }
  };

  const disconnect = async a => {
    if (!window.confirm(`Disconnect ${a.fromEmail}? Campaigns using it will pause.`)) return;
    try { await del(`/accounts/${a._id}`); toast('Account disconnected'); load(); } catch (e) { notify(toast, e); }
  };

  const active = accounts.filter(a => a.status === 'active').length;

  return <>
    <div className="card luxe-card">
      <div className="mini-row">
        <div><h2 style={{ margin:0 }}>Connect a sending account</h2>
          <p className="muted" style={{ margin:'4px 0 0' }}>You send from your own mailbox. Credentials are encrypted at rest and never shown again.</p></div>
        <span className="badge ok">{active} active</span>
      </div>

      <div className="method-tabs">
        <button className={method === 'smtp' ? 'active' : ''} onClick={() => setMethod('smtp')}><Icon name="mail" size={14}/> SMTP / IMAP</button>
        <button className={method === 'esp_api' ? 'active' : ''} onClick={() => setMethod('esp_api')}><Icon name="bolt" size={14}/> ESP API key</button>
      </div>

      {method !== 'oauth' && <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', marginTop:14 }}>
        <div><label>From address</label>
          <input placeholder="you@yourdomain.com" value={form.fromEmail} onChange={e => setForm({ ...form, fromEmail:e.target.value })}/></div>
        <div><label>Display name</label>
          <input placeholder="Your name" value={form.fromName} onChange={e => setForm({ ...form, fromName:e.target.value })}/></div>
      </div>}

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

      {method === 'oauth' && <div className="oauth-grid" style={{ marginTop:14 }}>
        <button className="oauth-btn" onClick={() => oauth('google')}><span className="oauth-g">G</span> Sign in with Google</button>
        <button className="oauth-btn" onClick={() => oauth('microsoft')}><span className="oauth-ms">▦</span> Sign in with Microsoft</button>
      </div>}


      <div className="row" style={{ marginTop:16, justifyContent:'space-between' }}>
        <span className="muted" style={{ fontSize:12 }}>We never provide mailboxes, IPs or domains — your reputation stays yours.</span>
        <button className="btn" onClick={connect} disabled={busy === 'connect'}>
          {busy === 'connect' ? 'Checking credentials…' : 'Connect account'}</button>
      </div>
      {busy === 'connect' && method === 'smtp' && <p className="muted" style={{ marginTop:8, fontSize:12 }}>Opening a real connection to {creds.host}:{creds.port} to verify the login…</p>}
    </div>

    <div className="card table-card" style={{ marginTop:16, padding:18 }}>
      <div className="mini-row"><h2 style={{ margin:0 }}>Connected accounts</h2><span className="badge">{accounts.length}</span></div>
      <table><thead><tr><th>From</th><th>Method</th><th>Status</th><th>Sent today / cap</th><th></th></tr></thead><tbody>
        {accounts.map(a => <tr key={a._id}>
          <td><div><b style={{ fontSize:13 }}>{a.fromEmail}</b><div className="muted" style={{ fontSize:11 }}>{a.fromName || a.smtpHost || '—'}</div></div></td>
          <td>{METHOD_LABEL[a.authMethod] || a.authMethod}</td>
          <td><span className={`badge ${a.status === 'active' ? 'ok' : a.status === 'error' ? 'danger' : 'warn'}`}>{a.status.replace(/_/g, ' ')}</span>
            {a.lastError && <div className="muted" style={{ fontSize:11, maxWidth:220 }}>{a.lastError}</div>}</td>
          <td>{a.sentToday || 0} / {a.dailyCap}</td>
          <td className="row" style={{ gap:6 }}>
            <button className="btn secondary sm" onClick={() => test(a)} disabled={testing === a._id}>
              {testing === a._id ? 'Sending…' : 'Send test'}</button>
            <button className="btn ghost sm" onClick={() => disconnect(a)}>Disconnect</button>
          </td>
        </tr>)}
        {!accounts.length && <tr><td colSpan={5} className="empty">No accounts connected yet</td></tr>}
      </tbody></table>
    </div>
  </>;
}

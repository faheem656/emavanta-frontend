'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '../../../lib/api';
import AuthShell, { AuthField } from '../../../components/AuthShell';

const strength = pw => {
  const checks = [/.{10,}/, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/];
  return checks.filter(rx => rx.test(pw || '')).length;
};

export default function ResetPassword() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [state, setState] = useState({ checking: true, valid: false, reason: '', email: '' });
  const [pw, setPw] = useState({ password: '', repeat: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('token') || new URLSearchParams(window.location.search).get('token') || '';
    if (t) window.history.replaceState(null, '', window.location.pathname);
    setToken(t);
    if (!t) { setState({ checking: false, valid: false, reason: 'missing' }); return; }
    post('/auth/password/reset/check', { token: t })
      .then(r => setState({ checking: false, valid: !!r.valid, reason: r.reason || '', email: r.email || '' }))
      .catch(() => setState({ checking: false, valid: false, reason: 'not_found' }));
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (pw.password !== pw.repeat) { setError('The two passwords do not match.'); return; }
    if (pw.password.length < 10) { setError('Use at least 10 characters.'); return; }
    setBusy(true); setError('');
    try {
      const r = await post('/auth/password/reset', { token, password: pw.password });
      setDone(r);
      setTimeout(() => router.push('/signin'), 2200);
    } catch (err) { setError(err.message || 'Could not reset the password.'); }
    finally { setBusy(false); }
  };

  const score = strength(pw.password);
  const reasonText = {
    missing: 'This link is missing its token.',
    not_found: 'This reset link is not valid any more.',
    expired: 'This reset link has expired.'
  }[state.reason] || 'This reset link is not usable.';

  const card = <>
    <h2>Choose a new password</h2>
    {state.checking && <p className="au-sub">Checking your link…</p>}
    {!state.checking && !state.valid && <>
      <div className="au-alert error"><span className="au-dotmark warn" aria-hidden="true" /><span>{reasonText}</span></div>
      <Link className="au-submit" href="/forgot-password" style={{ display: 'block', textAlign: 'center', marginTop: 14, textDecoration: 'none', lineHeight: '1.6' }}>
        Request a new link</Link>
    </>}
    {!state.checking && state.valid && !done && <form onSubmit={submit} noValidate>
      {state.email && <p className="au-sub">for <b>{state.email}</b></p>}
      <AuthField label="New password">
        <input type="password" autoComplete="new-password" autoFocus value={pw.password}
          onChange={e => setPw({ ...pw, password: e.target.value })} placeholder="at least 10 characters" />
        <div className="au-meter" aria-hidden="true">{[1,2,3,4,5].map(i => <span key={i} className={score >= i ? `on s${score}` : ''} />)}</div>
        <span className="au-hint">{score <= 2 ? 'Weak — add capitals, numbers and a symbol.' : score <= 3 ? 'Okay — a little longer would be better.' : 'Strong password.'}</span>
      </AuthField>
      <AuthField label="Repeat password" error={pw.repeat && pw.repeat !== pw.password ? 'The two passwords do not match.' : null}>
        <input type="password" autoComplete="new-password" value={pw.repeat} onChange={e => setPw({ ...pw, repeat: e.target.value })} />
      </AuthField>
      <button className="au-submit" type="submit" disabled={busy || pw.password.length < 10}>
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>}
    {error && <div className="au-alert error"><span className="au-dotmark warn" aria-hidden="true" /><span>{error}</span></div>}
    {done && <div className="au-alert ok"><span className="au-dotmark ok" aria-hidden="true" /><span>
      <b>Password changed.</b> {done.signedOutSessions ? `${done.signedOutSessions} other session(s) were signed out. ` : ''}Taking you to sign in…</span></div>}
    <p className="au-note" style={{ marginTop: 16 }}><Link href="/signin">Back to sign in</Link></p>
  </>;

  return <AuthShell eyebrow="New password" title="Set a password" highlight="only you know."
    lead="The link works once. When you save, every other device is signed out and you sign in again with the new password."
    bullets={['Single use, expires in an hour', 'Other sessions are terminated', 'Both passwords must match']}>
    {card}
  </AuthShell>;
}

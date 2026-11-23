'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '../../../lib/api';
import { authDestination } from '../../../lib/auth-flow';
import AuthShell, { AuthField } from '../../../components/AuthShell';
import EmailOtp from '../../../components/EmailOtp';

/**
 * Sign in.
 *
 * Two steps live on this page because they are one mental action for the user:
 *   1. email + password,
 *   2. the 6-digit authenticator code (only when 2FA is enabled for the account).
 * If the account has no 2FA, step 2 never appears.
 */
export default function Signin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [emailChallenge, setEmailChallenge] = useState(null);
  const [busy, setBusy] = useState('');

  // 2FA step
  const [challenge, setChallenge] = useState(null); // { challengeToken }
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [codeError, setCodeError] = useState('');
  const codeRef = useRef(null);

  useEffect(() => { if (challenge) codeRef.current?.focus(); }, [challenge]);

  const finish = data => {
    localStorage.setItem('emavanta_token', data.token);
    if (data.user?.email) localStorage.setItem('emavanta_email', data.user.email);
    setNotice('Signed in. Opening your workspace…');
    router.push(authDestination(window.location.search));
  };

  const submit = async event => {
    event.preventDefault();
    const next = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim())) next.email = 'Enter the email you signed up with.';
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    setNotice('');
    if (Object.keys(next).length) return;

    setBusy('password');
    try {
      const result = await post('/auth/login', { email: form.email.trim(), password: form.password });
      if (result?.verificationRequired) { setEmailChallenge(result); return; }
      if (result?.mfaRequired) {
        setChallenge({ challengeToken: result.challengeToken });
        setCode('');
        setCodeError('');
        return;
      }
      finish(result);
    } catch (err) {
      if (err.code === 'EMAIL_DELIVERY_FAILED' && err.details?.challengeToken) { setEmailChallenge({ ...err.details, deliveryError: err.message }); return; }
      // Keep the reason on the field it belongs to, and a sentence the user can act on.
      const message = err.message || 'Could not sign in.';
      if (/password/i.test(message) && /wrong|invalid|incorrect/i.test(message)) setErrors({ password: message });
      else if (/verify/i.test(message)) setNotice(message);
      else setNotice(message);
    } finally { setBusy(''); }
  };

  const verify = async event => {
    event.preventDefault();
    const cleaned = code.replace(/\s+/g, '');
    if (useRecovery) {
      if (cleaned.length < 8) { setCodeError('Recovery codes look like A1B2C-3D4E5.'); return; }
    } else if (!/^\d{6}$/.test(cleaned)) {
      setCodeError('The code is six digits — check your authenticator app.');
      return;
    }
    setBusy('code'); setCodeError('');
    try {
      const result = await post('/auth/login/mfa', { challengeToken: challenge.challengeToken, code: cleaned });
      if (result?.usedRecovery) {
        // A recovery code is single-use; tell them how many are left so nobody gets locked out.
        localStorage.setItem('emavanta_recovery_note', `${result.remainingRecovery} recovery code(s) left`);
      }
      finish(result);
    } catch (err) {
      setCodeError(err.message || 'That code did not work. Try the next one from your app.');
      setCode('');
    } finally { setBusy(''); }
  };

  /* ------------------------------------------------------------ */
  /* Step 2 — authenticator code                                   */
  /* ------------------------------------------------------------ */
  if (emailChallenge) return <EmailOtp initial={emailChallenge} onBack={() => setEmailChallenge(null)} onVerified={result => {
    setEmailChallenge(null);
    if (result.mfaRequired) setChallenge({ challengeToken: result.challengeToken });
    else finish(result);
  }} />;

  if (challenge) {
    return <AuthShell eyebrow="Two-factor" title="Almost in." highlight="Prove it’s you."
      lead="Your workspace is protected with an authenticator app. Enter the current code to finish signing in."
      bullets={['Codes change every 30 seconds', 'Recovery codes work once each', 'Nothing is sent by email']}>
      <div className="au-steps"><i className="on" /><i className="on" /></div>
      <span className="au-badge-2fa"><span className="au-lock" aria-hidden="true" /> Two-factor step</span>
      <h2>{useRecovery ? 'Use a recovery code' : 'Enter your code'}</h2>
      <p className="au-sub">
        {useRecovery
          ? 'Type one of the recovery codes you saved when 2FA was switched on.'
          : 'Open Google Authenticator (or any TOTP app) and type the six digits for Emavanta.'}
      </p>
      <form onSubmit={verify} noValidate>
        <AuthField label={useRecovery ? 'Recovery code' : '6-digit code'}
          error={codeError} hint={useRecovery ? 'Example: A1B2C-3D4E5' : 'The code refreshes every 30 seconds.'}>
          <input ref={codeRef} className={useRecovery ? '' : 'au-code'} value={code}
            inputMode={useRecovery ? 'text' : 'numeric'} autoComplete="one-time-code"
            maxLength={useRecovery ? 11 : 6} placeholder={useRecovery ? 'A1B2C-3D4E5' : '000000'}
            onChange={e => {
              const raw = e.target.value;
              setCode(useRecovery ? raw.toUpperCase().replace(/[^A-Z0-9-]/g, '') : raw.replace(/\D/g, '').slice(0, 6));
              setCodeError('');
            }} />
        </AuthField>
        <button className="au-submit" type="submit" disabled={busy === 'code'}>
          {busy === 'code' ? 'Checking…' : 'Verify and sign in'}
        </button>
      </form>
      <button className="au-back" type="button" onClick={() => { setUseRecovery(!useRecovery); setCode(''); setCodeError(''); }}>
        {useRecovery ? '← Use the authenticator code instead' : 'Lost your phone? Use a recovery code'}
      </button>
      <p className="au-note">
        Codes expire five minutes after the password step.{' '}
        <button className="au-back" style={{ marginTop: 0 }} onClick={() => { setChallenge(null); setCode(''); }}>Start over</button>
      </p>
      {!useRecovery && <p className="au-alert info" style={{ marginTop: 12 }}>
        <span className="au-dotmark info" aria-hidden="true" /><span>If you never saved recovery codes, open Security → Two-factor after signing in on a trusted device.</span>
      </p>}
    </AuthShell>;
  }

  /* ------------------------------------------------------------ */
  /* Step 1 — email + password                                     */
  /* ------------------------------------------------------------ */
  return <AuthShell eyebrow="Welcome back" title="Pick up where" highlight="your pipeline left off."
    lead="Campaigns, replies and account health in one place — and the mailboxes stay yours, on your own domains."
    bullets={['Human-like cadence keeps running while you sleep', 'Replies attributed back to the exact campaign', 'Usage visible before you hit a limit']}
    footer={<p className="au-note" style={{ textAlign: 'center' }}>
      New here? <Link href="/signup">Create a workspace</Link>
    </p>}>
    <div className="au-steps"><i className="on" /><i /></div>
    <h2>Sign in</h2>
    <p className="au-sub">Use the email address this workspace was created with.</p>
    <form onSubmit={submit} noValidate>
      <AuthField label="Email" error={errors.email}>
        <input type="email" autoComplete="email" autoFocus value={form.email}
          onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: null }); }}
          placeholder="you@company.com" />
      </AuthField>
      <AuthField label="Password" error={errors.password}>
        <div className="au-pw">
          <input type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password}
            onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: null }); }}
            placeholder="Your password" />
          <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
        </div>
      </AuthField>
      <div className="au-row">
        <label className="au-remember"><input type="checkbox" defaultChecked /> Keep me signed in</label>
        <Link className="au-link" href="/forgot-password">Forgot password?</Link>
      </div>
      <button className="au-submit" type="submit" disabled={busy === 'password'}>
        {busy === 'password' ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
    {notice && <div className="au-alert error"><span className="au-dotmark warn" aria-hidden="true" /><span>{notice}</span></div>}
    <p className="au-alert info" style={{ marginTop: 14 }}>
      <span className="au-dotmark info" aria-hidden="true" /><span><b>Two-factor ready.</b> If 2FA is on for your account, the code step appears right after your password.</span>
    </p>
  </AuthShell>;
}

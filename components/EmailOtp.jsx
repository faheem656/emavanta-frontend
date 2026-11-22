'use client';
import { useEffect, useState } from 'react';
import { post } from '../lib/api';
import AuthShell, { AuthField } from './AuthShell';

export default function EmailOtp({ initial, onVerified, onBack }) {
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [retryAt, setRetryAt] = useState(() => Number.isFinite(initial.retryAfterSeconds) ? Date.now() + initial.retryAfterSeconds * 1000 : (Date.parse(initial.resendAvailableAt) || 0));
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const retrySeconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  async function verify(event) {
    event.preventDefault(); setError('');
    if (!/^\d{6}$/.test(code)) { setError('Enter the six-digit code.'); return; }
    setBusy(true);
    try { onVerified(await post('/auth/verify-otp', { challengeToken: challenge.challengeToken, code })); }
    catch (e) { setError(e.message || 'Could not verify the code.'); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(''); setInfo('');
    try { const result = await post('/auth/verify-otp/resend', { challengeToken: challenge.challengeToken }); setChallenge(result); setRetryAt(Number.isFinite(result.retryAfterSeconds) ? Date.now() + result.retryAfterSeconds * 1000 : (Date.parse(result.resendAvailableAt) || 0)); setCode(''); setInfo(result.sent ? 'A fresh code was sent.' : ''); }
    catch (e) {
      if (e.code === 'EMAIL_DELIVERY_FAILED' && e.details?.challengeToken) { setChallenge({ ...e.details, deliveryError: e.message }); setRetryAt(Number.isFinite(e.details.retryAfterSeconds) ? Date.now() + e.details.retryAfterSeconds * 1000 : (Date.parse(e.details.resendAvailableAt) || 0)); }
      else { if (e.code === 'RATE_LIMITED' && e.details?.retryAfterSeconds) setRetryAt(Date.now() + e.details.retryAfterSeconds * 1000); setError(e.message || 'Could not send another code.'); }
    }
    finally { setBusy(false); }
  }
  return <AuthShell eyebrow="Email verification" title="Check your inbox." highlight="Verify your email."
    lead="Enter the six-digit code to activate your account." bullets={['The code expires in 10 minutes', 'Each code works once', 'Check spam if the message is delayed']}>
    <h2>Enter your verification code</h2><p className="au-sub">{challenge.sent ? 'We sent a code to' : 'Verification address:'} <b>{challenge.email}</b>.</p>
    {challenge.deliveryError && <div className="au-alert error" role="alert">{challenge.deliveryError}</div>}
    {info && <div className="au-alert ok">{info}</div>}
    <form onSubmit={verify} noValidate>
      <AuthField label="6-digit code" error={error}>
        <input className="au-code" value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} autoFocus />
      </AuthField>
      <button className="au-submit" disabled={busy}>{busy ? 'Checking…' : 'Verify email'}</button>
    </form>
    <button className="au-submit ghost" style={{ marginTop: 12 }} onClick={resend} disabled={busy || retrySeconds > 0}>{retrySeconds ? `Send another code in ${retrySeconds}s` : 'Send another code'}</button>
    {onBack && <button className="au-back" onClick={onBack}>Back to sign in</button>}
  </AuthShell>;
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { post } from '../../../lib/api';
import AuthShell from '../../../components/AuthShell';

// Existing link-based emails can still be redeemed; new accounts use OTP at sign-in.
export default function VerifyEmail() {
  const [state, setState] = useState('checking');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('idle'); return; }
    post('/auth/verify/confirm', { token }).then(() => setState('ok')).catch(e => { setMessage(e.message); setState('failed'); });
  }, []);
  return <AuthShell eyebrow="Email check" title="Verify your" highlight="email address."
    lead="Your account is protected with an email verification code."
    bullets={['Codes expire after 10 minutes', 'A code can only be used once', 'You can request a new code from sign in']}>
    <h2>Verify your email</h2>
    {state === 'checking' && <p className="au-sub">Checking your link…</p>}
    {state === 'ok' && <div className="au-alert ok">Email verified. Please sign in.</div>}
    {state === 'failed' && <div className="au-alert error">{message || 'This link is no longer valid.'}</div>}
    {state === 'idle' && <p className="au-sub">Sign in with your email and password to request a verification code.</p>}
    {state !== 'checking' && <Link className="au-submit" href="/signin" style={{ display:'block', textAlign:'center', textDecoration:'none', marginTop:14 }}>Go to sign in</Link>}
  </AuthShell>;
}

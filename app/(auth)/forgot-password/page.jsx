'use client';
import { useState } from 'react';
import Link from 'next/link';
import { post } from '../../../lib/api';
import AuthShell, { AuthField } from '../../../components/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) { setError('Enter the email you signed up with.'); return; }
    setBusy(true); setError('');
    try { setSent(await post('/auth/password/forgot', { email: email.trim() })); }
    catch (err) { setError(err.message || 'Could not send the reset link just now. Try again in a moment.'); }
    finally { setBusy(false); }
  };

  return <AuthShell eyebrow="Password help" title="Get back in" highlight="without the guesswork."
    lead="We send a single-use link that expires in an hour. Using it signs out every other device, so nobody stays logged in with your old password."
    bullets={['One link, one use, one hour', 'Every other device is signed out', 'We never reveal whether an address exists']}>
    <h2>Forgot your password?</h2>
    <p className="au-sub">Enter the email you signed up with and we will send the reset link.</p>
    <form onSubmit={submit} noValidate>
      <AuthField label="Email" error={error ? null : undefined}>
        <input type="email" autoComplete="email" autoFocus value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@company.com" />
      </AuthField>
      <button className="au-submit" type="submit" disabled={busy || !email.trim()}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
    {error && <div className="au-alert error"><span className="au-dotmark warn" aria-hidden="true" /><span>{error}</span></div>}
    {sent && <div className="au-alert ok" style={{ display: 'block' }}>
      <b>{sent.message}</b>
      <br />Did not arrive in five minutes? Check spam, then try again.
    </div>}
    <p className="au-note" style={{ marginTop: 16 }}>
      Remembered it? <Link href="/signin">Back to sign in</Link> · No account yet? <Link href="/signup">Create one</Link>
    </p>
  </AuthShell>;
}

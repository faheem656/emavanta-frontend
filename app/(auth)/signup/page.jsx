'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '../../../lib/api';
import AuthShell, { AuthField } from '../../../components/AuthShell';
import EmailOtp from '../../../components/EmailOtp';

const score = pw => [/.{10,}/, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(rx => rx.test(pw || '')).length;
const verdict = s => s <= 2 ? 'Weak — add a capital, a number and a symbol.' : s === 3 ? 'Okay — a little longer would be better.'
  : s === 4 ? 'Strong password.' : 'Excellent password.';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', organization: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [verification, setVerification] = useState(null);

  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: null })); };

  const submit = async event => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Tell us what to call you.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim())) next.email = 'A work email keeps recovery and invites working.';
    if (form.organization.trim().length < 2) next.organization = 'Your workspace needs a name.';
    if (form.password.length < 12) next.password = 'Use at least 12 characters.';
    else if (score(form.password) < 3) next.password = 'Add a capital, a number or a symbol.';
    setErrors(next);
    setNotice('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const result = await post('/auth/register', {
        name: form.name.trim(), email: form.email.trim(), organization: form.organization.trim(), password: form.password
      });
      if (result.verificationRequired) setVerification(result);
      else throw new Error('Verification could not be started. Please try signing in.');
    } catch (err) {
      if (err.code === 'EMAIL_DELIVERY_FAILED' && err.details?.challengeToken) { setVerification({ ...err.details, deliveryError: err.message }); return; }
      const message = err.message || 'Could not create the workspace.';
      if (/email/i.test(message) && /exist|taken/i.test(message)) setErrors({ email: message });
      else setNotice(message);
    } finally { setBusy(false); }
  };

  if (verification) return <EmailOtp initial={verification} onVerified={result => {
    localStorage.setItem('emavanta_token', result.token);
    router.push('/dashboard');
  }} onBack={() => router.push('/signin')} />;

  const strength = score(form.password);

  return <AuthShell eyebrow="Get started" title="Your engine." highlight="Your accounts."
    lead="Create a workspace in about a minute. Nothing to install, no card, and you can explore before connecting a mailbox."
    bullets={['Free plan starts after email verification', 'Connect your own sending account', 'Manage your workspace and contacts']}
    footer={<p className="au-note" style={{ textAlign: 'center' }}>
      Already have a workspace? <Link href="/signin">Sign in</Link>
    </p>}>
    <div className="au-steps"><i className="on" /><i /></div>
    <h2>Create your workspace</h2>
    <p className="au-sub">Four fields, then verify the code sent to your email.</p>
    <form onSubmit={submit} noValidate>
      <AuthField label="Your name" error={errors.name}>
        <input autoComplete="name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Dana Kazlauskas" autoFocus />
      </AuthField>
      <AuthField label="Work email" error={errors.email}>
        <input type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
      </AuthField>
      <AuthField label="Workspace name" error={errors.organization} hint="Shown to teammates you invite.">
        <input autoComplete="organization" value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="Northwind Studio" />
      </AuthField>
      <AuthField label="Password" error={errors.password}>
        <div className="au-pw">
          <input type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password}
            onChange={e => set('password', e.target.value)} placeholder="12+ characters" />
          <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
        </div>
        <div className="au-meter" aria-hidden="true">
          {[1, 2, 3, 4, 5].map(i => <span key={i} className={strength >= i ? `on s${strength}` : ''} />)}
        </div>
        {form.password && !errors.password ? <span className="au-hint">{verdict(strength)}</span> : null}
      </AuthField>
      <button className="au-submit" type="submit" disabled={busy}>
        {busy ? 'Creating your workspace…' : 'Create workspace'}
      </button>
    </form>
    {notice && <div className="au-alert error"><span className="au-dotmark warn" aria-hidden="true" /><span>{notice}</span></div>}
    <p className="au-note">
      By continuing you agree that you are the sender of the messages you send. Read the{' '}
      <Link href="/legal/terms">terms</Link> and <Link href="/legal/privacy">privacy notice</Link>.
    </p>
  </AuthShell>;
}

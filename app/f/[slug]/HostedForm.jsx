'use client';
import { useState } from 'react';

/**
 * The hosted form itself. Everything the visitor sees is driven by the form document, and
 * every failure is shown inline in the visitor's language — a public form must never dump
 * "Internal error" on a stranger.
 */
export default function HostedForm({ form }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | done
  const [notice, setNotice] = useState('');
  const accent = form.appearance?.accent || '#2563eb';
  const fields = form.fields || [];

  const set = (key, value) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: null }));
  };

  const submit = async event => {
    event.preventDefault();
    if (state === 'sending') return;
    // Cheap client-side pass first, so the visitor gets instant feedback; the server still
    // validates everything because a form URL can be posted to directly.
    const local = {};
    for (const field of fields) {
      const value = field.type === 'checkbox' ? (values[field.key] ? 'on' : '') : String(values[field.key] || '').trim();
      if (field.required && !value) local[field.key] = `${field.label} is required`;
      if (field.type === 'email' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value)) {
        local[field.key] = 'That email address looks incomplete';
      }
    }
    if (Object.keys(local).length) { setErrors(local); setNotice('Please fix the highlighted fields.'); return; }

    setState('sending'); setNotice('');
    try {
      const res = await fetch(`/api/v1/public/forms/${encodeURIComponent(form.slug)}/submit`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ fields: values, _hp: values._hp || '' })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldErrors = body?.error?.details?.fields;
        if (Array.isArray(fieldErrors)) setErrors(Object.fromEntries(fieldErrors.map(f => [f.field, f.message])));
        setNotice(body?.error?.message || 'We could not save that just now. Please try again.');
        setState('idle');
        return;
      }
      if (body.redirectUrl) { window.location.href = body.redirectUrl; return; }
      setState('done'); setNotice(body.message || 'Thanks — you are on the list.');
    } catch {
      setState('idle');
      setNotice('We could not reach the server. Check your connection and try again.');
    }
  };

  if (state === 'done') {
    return <div className="hf-card hf-done" style={{ '--hf-accent': accent }}>
      <div className="hf-tick" aria-hidden="true">✓</div>
      <h1>{form.headline || form.name}</h1>
      <p className="hf-sub">{notice}</p>
    </div>;
  }

  return <form className={`hf-card hf-${form.appearance?.layout === 'inline' ? 'inline' : 'card'}`}
    style={{ '--hf-accent': accent }} onSubmit={submit} noValidate>
    <h1>{form.headline || form.name}</h1>
    {form.description ? <p className="hf-sub">{form.description}</p> : null}

    {fields.map(field => <label className="hf-field" key={field.key}>
      <span>{field.label}{field.required ? <em>*</em> : null}</span>
      {field.type === 'checkbox' ? <input type="checkbox" checked={!!values[field.key]} onChange={e => set(field.key, e.target.checked)} aria-invalid={!!errors[field.key]} />
      : field.type === 'textarea'
        ? <textarea rows={4} value={values[field.key] || ''} placeholder={field.placeholder || ''}
            onChange={e => set(field.key, e.target.value)} aria-invalid={!!errors[field.key]} />
        : field.type === 'select'
          ? <select value={values[field.key] || ''} onChange={e => set(field.key, e.target.value)}
              aria-invalid={!!errors[field.key]}>
              <option value="">{field.placeholder || 'Choose…'}</option>
              {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          : <input type={field.type === 'tel' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
              value={values[field.key] || ''} placeholder={field.placeholder || ''}
              onChange={e => set(field.key, e.target.value)} aria-invalid={!!errors[field.key]} />}
      {errors[field.key] ? <small className="hf-err">{errors[field.key]}</small> : null}
    </label>)}

    {/* Honeypot: humans never see or fill this. */}
    <input className="hf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
      value={values._hp || ''} onChange={e => set('_hp', e.target.value)} name="_hp" />

    {notice && !Object.keys(errors).length ? <p className="hf-err" style={{ marginTop:4 }}>{notice}</p> : null}

    <button className="hf-submit" type="submit" disabled={state === 'sending'}>
      {state === 'sending' ? 'Sending…' : (form.submitLabel || 'Subscribe')}
    </button>
    <p className="hf-fine">{form.organizationName ? `${form.organizationName} · ` : ''}No spam. Unsubscribe any time.</p>
  </form>;
}

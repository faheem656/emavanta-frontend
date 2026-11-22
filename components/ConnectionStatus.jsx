'use client';
import { useEffect, useRef, useState } from 'react';
import { health, REQUIRED_API_SCHEMA as REQUIRED } from '../lib/api';
import Icon from './Icon';

/**
 * Shows a real, honest connection state. While the API is down it explains exactly
 * how to fix it, retries every 4s, and reloads data automatically once it returns.
 */
export default function ConnectionStatus({ compact = false }) {
  const [state, setState] = useState({ ok: true, checked: false, status: 0, attempt: 0 });
  const timer = useRef(null);
  const wasDown = useRef(false);

  const check = async () => {
    const r = await health();
    setState(s => ({ ok: r.ok, outdated: !!r.outdated, databaseUnavailable: !!r.databaseUnavailable, schema: r.schema, checked: true, status: r.status || 0, attempt: s.attempt + (r.ok ? 0 : 1) }));
    if (r.ok && wasDown.current) {
      wasDown.current = false;
      setTimeout(() => window.location.reload(), 400);
    }
    if (!r.ok) wasDown.current = true;
  };

  useEffect(() => {
    check();
    timer.current = setInterval(() => { if (!state.ok) check(); }, 4000);
    return () => clearInterval(timer.current);
  }, [state.ok]);

  useEffect(() => {
    const off = () => setState(s => ({ ...s, ok: false, attempt: s.attempt + 1 }));
    const on = () => setState(s => s.databaseUnavailable ? s : ({ ...s, ok: true }));
    window.addEventListener('emavanta:api-offline', off);
    window.addEventListener('emavanta:api-online', on);
    return () => { window.removeEventListener('emavanta:api-offline', off); window.removeEventListener('emavanta:api-online', on); };
  }, []);

  if (state.ok) return compact
    ? <span className="conn-pill ok" title="API connected"><i /> Connected</span>
    : null;

  if (state.outdated) return <div className="conn-banner" role="alert">
    <div className="conn-icon"><Icon name="bolt" size={17} /></div>
    <div className="conn-body">
      <b>The API is running, but it is older than this dashboard</b>
      <span>Running schema <code>{state.schema ?? 0}</code>, this dashboard needs <code>{REQUIRED}</code> — so a few newest actions still point at routes the old process does not have.</span>
      <div className="conn-steps">
        <span>Reload the page. If the problem continues, contact support.</span>
      </div>
    </div>
    <div className="conn-actions"><button className="btn sm" onClick={check}><Icon name="refresh" size={14} /> Re-check</button></div>
  </div>;

  return <div className="conn-banner" role="alert">
    <div className="conn-icon"><Icon name="bolt" size={17} /></div>
    <div className="conn-body">
      <b>{state.databaseUnavailable ? 'Database connection temporarily unavailable' : 'The service is temporarily unavailable'}</b>
      <span>{state.databaseUnavailable ? 'The API is running, but its database connection is unavailable.' : 'The service could not be reached, so data can’t load.'}
        {state.status ? ` (proxy replied ${state.status})` : ''} Retrying automatically{state.attempt ? ` · attempt ${state.attempt}` : ''}.</span>
      <div className="conn-steps">
        <span>Try again. If the problem continues, contact support.</span>
      </div>
    </div>
    <div className="conn-actions">
      <button className="btn sm" onClick={check}><Icon name="refresh" size={14} /> Retry now</button>
      <a className="btn ghost sm" href="/status">Diagnostics</a>
    </div>
  </div>;
}

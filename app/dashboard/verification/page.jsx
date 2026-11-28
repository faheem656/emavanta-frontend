'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { get, post } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : (v?.items || []);

const STATUS_META = {
  VALID:      { label: 'Deliverable', color: '#0f9d6e' },
  INVALID:    { label: 'Invalid',      color: '#d64550' },
  CATCH_ALL:  { label: 'Catch-all',    color: '#f2a93b' },
  RISKY:      { label: 'Risky',        color: '#d97706' },
  PENDING:    { label: 'Checking',     color: '#4c3fd0' },
  UNKNOWN:    { label: 'Unknown',      color: '#94a3b8' },
  ERROR:      { label: 'Error',        color: '#b45309' },
  UNVERIFIED: { label: 'Not checked',  color: '#cbd5e1' }
};
const STATUSES = ['VALID', 'INVALID', 'CATCH_ALL', 'RISKY', 'PENDING', 'UNKNOWN', 'ERROR'];

const fmt = n => Number(n) < 0 ? 'Unlimited' : Number(n || 0).toLocaleString();

// Bounce history beats any older "valid" verdict (stale rows self-heal on the
// next run) — the badge must never claim a bounced address is deliverable.
const effVerification = c => {
  const v = c.verification;
  if (!v?.status) return null;
  if ((c.status === 'bounced' || c.status === 'complained') && v.status !== 'INVALID')
    return { ...v, status: 'INVALID', reason: 'bounced' };
  return v;
};

export default function VerificationCenter() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [lists, setLists] = useState([]);
  const [preview, setPreview] = useState([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');       // '' | status | UNVERIFIED
  const [selectedLists, setSelectedLists] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [unverifiedOnly, setUnverifiedOnly] = useState(true);
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const epoch = useRef(0);

  const loadStats = useCallback(() =>
    get('/contacts/verification-stats').then(r => { if (r && !Array.isArray(r)) setStats(r); }).catch(() => {}), []);

  const loadPreview = useCallback(() => {
    const e = ++epoch.current;
    const q = new URLSearchParams({ limit: '25', ...(statusFilter ? { verification: statusFilter } : {}) });
    return get(`/contacts?${q}`).then(r => {
      if (e !== epoch.current) return;
      setPreview(arr(r)); setPreviewTotal(r?.total ?? arr(r).length);
    }).catch(() => {});
  }, [statusFilter]);

  const load = useCallback(() => Promise.allSettled([
    loadStats(),
    loadPreview(),
    get('/contacts/lists').then(r => setLists(arr(r)))
  ]), [loadStats, loadPreview]);

  useEffect(() => { load().finally(() => setLoaded(true)); }, [load]);

  // Live results: while anything is being checked, refresh every4 seconds.
  const pending = stats?.counts?.PENDING || 0;
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => { loadStats(); loadPreview(); }, 4000);
    return () => clearInterval(t);
  }, [pending, loadStats, loadPreview]);

  const credits = stats?.credits || {};
  const counts = stats?.counts || {};
  const total = stats?.total || 0;
  const checked = Math.max(0, total - (counts.UNVERIFIED || 0));
  const pctChecked = total ? Math.round((checked / total) * 100) : 0;

  const listMap = useMemo(() => Object.fromEntries(lists.map(l => [l._id, l])), [lists]);
  const selectedListContacts = selectedLists.reduce((sum, id) => sum + (Number(listMap[id]?.count) || 0), 0);

  const toggleList = id => setSelectedLists(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

  const runVerify = async (body, successTitle) => {
    setBusy('run');
    try {
      const r = await post('/contacts/verify', body);
      setLastResult({ at: new Date(), queued: r.queued, skippedFresh: r.skippedFresh || 0, total: r.total || 0 });
      toast({ title: successTitle || `${r.queued} address(es) queued`, message: r.note || 'Results appear within seconds.' });
      setSelectedRows([]);
      loadStats(); loadPreview();
    } catch (e) { notify(toast, e); }
    finally { setBusy(''); }
  };

  const verifyLists = () => {
    if (!selectedLists.length || busy) return;
    runVerify({
      listIds: selectedLists,
      ...(force ? { force: true } : unverifiedOnly ? { unverifiedOnly: true } : {})
    }, `Verifying ${selectedLists.length} list(s) · ${fmt(selectedListContacts)} contacts`);
  };

  const verifyAllUnverified = () => {
    if (busy) return;
    runVerify({ unverifiedOnly: true }, 'Verifying every unchecked contact (up to 5,000 per run)');
  };

  const verifyRows = () => {
    if (!selectedRows.length || busy) return;
    runVerify({ contactIds: selectedRows, ...(force ? { force: true } : {}) }, `${selectedRows.length} contact(s) queued`);
  };

  if (!loaded) return <DashboardSkeleton variant="overview" />;

  return <>
    <PageHead title="Verification" subtitle="Check every address before you send — limits, lists and results in one place"
      actions={<div className="row">
        <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={14}/> Refresh</button>
        <Link className="btn secondary sm" href="/dashboard/billing">Top up credits</Link>
      </div>} />

    {/* ── LIMITS — packs only (no plan includes verification credits) ── */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))', gap:14 }}>
      <div className="card">
        <div className="stat-label">Verification credits available</div>
        <div style={{ fontSize:26, fontWeight:700 }}>{fmt(credits.remaining)}</div>
        <div className="muted" style={{ fontSize:11.5, marginTop:6 }}>
          {credits.packBalance > 0
            ? <>One-time pack balance — <b>never expires</b>. Plans include none.</>
            : <>No credits yet — plans don’t include any. Verification is bought as packs.</>}
        </div>
        <Link className="btn secondary sm" style={{ marginTop:10 }} href="/dashboard/billing#packs">Buy a pack</Link>
      </div>

      <div className="card">
        <div className="stat-label">Coverage · contacts checked</div>
        <div style={{ fontSize:26, fontWeight:700 }}>
          {fmt(checked)} <span className="muted" style={{ fontSize:14, fontWeight:500 }}>/ {fmt(total)}</span>
        </div>
        <div className="progress ok" style={{ height:9, marginTop:10 }}>
          <i style={{ width: `${pctChecked}%` }}/>
        </div>
        <div className="muted" style={{ fontSize:11.5, marginTop:6 }}>
          {pctChecked}% checked{counts.PENDING ? <> · <b style={{ color:'#4c3fd0' }}>{counts.PENDING} checking right now</b></> : ''}
        </div>
      </div>

      <div className="card">
        <div className="stat-label">Knowledge base · shared results</div>
        <div style={{ fontSize:26, fontWeight:700 }}>{fmt(stats?.kbSize)}</div>
        <div className="muted" style={{ fontSize:11.5, marginTop:6 }}>
          Verified addresses remembered across the platform — a fresh result
          served to you costs no extra work for anyone.
        </div>
      </div>
    </div>

    {/* ── STATUS DISTRIBUTION ── */}
    <div className="card" style={{ marginTop:14 }}>
      <div className="mini-row">
        <div>
          <h2 style={{ margin:0, fontSize:16 }}>Results so far</h2>
          <span className="muted" style={{ fontSize:12 }}>Click a status to filter the activity table below</span>
        </div>
        {statusFilter && <button className="btn ghost sm" onClick={() => setStatusFilter('')}>Clear filter</button>}
      </div>
      <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:12 }}>
        {[...STATUSES, 'UNVERIFIED'].map(s => {
          const n = counts[s] || 0;
          const meta = STATUS_META[s];
          const active = statusFilter === s;
          if (!n && !active) return null;
          return <button key={s} className={`chip ${active ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter(active ? '' : s)}
            style={{ borderLeft:`3px solid ${meta.color}` }}>
            {meta.label} <b>{fmt(n)}</b>
          </button>;
        })}
      </div>
    </div>

    {/* ── RUN A CHECK · TARGET LISTS TOGETHER ── */}
    <div className="card" style={{ marginTop:14 }}>
      <div className="mini-row">
        <div>
          <h2 style={{ margin:0, fontSize:16 }}>Run a check</h2>
          <span className="muted" style={{ fontSize:12 }}>
            Pick one or many lists — they are verified together in a single run.
            Fresh results are skipped free of charge.
          </span>
        </div>
        <span className="badge">{selectedLists.length} list(s) · {fmt(selectedListContacts)} contacts</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(260px,1fr)', gap:16, marginTop:14 }}>
        {/* list picker */}
        <div>
          <div className="row" style={{ gap:8, marginBottom:8 }}>
            <button className="btn ghost sm" onClick={() => setSelectedLists(lists.map(l => l._id))}>Select all lists</button>
            <button className="btn ghost sm" onClick={() => setSelectedLists([])} disabled={!selectedLists.length}>Clear</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8, maxHeight:260, overflow:'auto', paddingRight:4 }}>
            {lists.map(l => {
              const on = selectedLists.includes(l._id);
              return <label key={l._id}
                style={{ display:'flex', alignItems:'center', gap:8, border:`1px solid ${on ? 'var(--accent,#4c3fd0)' : 'var(--border)'}`,
                  borderRadius:10, padding:'9px 12px', cursor:'pointer', background: on ? 'rgba(76,63,208,.06)' : 'transparent' }}>
                <input type="checkbox" checked={on} onChange={() => toggleList(l._id)} />
                <span style={{ flex:1, fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.name}</span>
                <span className="muted" style={{ fontSize:11.5 }}>{fmt(l.count || 0)}</span>
              </label>;
            })}
            {!lists.length && <div className="muted" style={{ fontSize:13 }}>No lists yet — create one in Contacts first.</div>}
          </div>
        </div>

        {/* options + run */}
        <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          <label className="check-row" style={{ fontSize:12.5 }}>
            <input type="checkbox" checked={unverifiedOnly} disabled={force}
              onChange={e => setUnverifiedOnly(e.target.checked)} />
            Only contacts never checked before
          </label>
          <label className="check-row" style={{ fontSize:12.5 }}>
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
            Force re-check everything <span className="muted">(uses credits even if fresh)</span>
          </label>

          <div className="divider" style={{ margin:'2px 0' }}/>

          <button className="btn" disabled={!!busy || !selectedLists.length} onClick={verifyLists}>
            {busy === 'run' ? 'Queuing…' : `Verify ${selectedLists.length || ''} selected list(s)`}
          </button>
          <button className="btn secondary" disabled={!!busy} onClick={verifyAllUnverified}>
            Verify ALL unchecked contacts
          </button>

          {lastResult && <div className="notice ok" style={{ fontSize:12, marginTop:0 }}>
            <b>Queued {fmt(lastResult.queued)}</b> · {fmt(lastResult.skippedFresh)} fresh skipped (free) ·
            {' '}{fmt(lastResult.total)} in scope · {lastResult.at.toLocaleTimeString()}
          </div>}
          <div className="muted" style={{ fontSize:11, marginTop:'auto' }}>
            1 credit = 1 real check. Duplicates inside a run, fresh re-checks and
            refunded “unknown” results cost nothing.
          </div>
        </div>
      </div>
    </div>

    {/* ── ACTIVITY TABLE ── */}
    <div className="card table-card" style={{ marginTop:14 }}>
      <div className="mini-row">
        <div>
          <h2 style={{ margin:0, fontSize:16 }}>Activity</h2>
          <span className="muted" style={{ fontSize:12 }}>
            {statusFilter ? `Filtered: ${STATUS_META[statusFilter]?.label || statusFilter}` : 'All contacts with a verification record'}
            {' · '}{fmt(previewTotal)} total
          </span>
        </div>
        <div className="row" style={{ gap:8 }}>
          <span className="muted" style={{ fontSize:12 }}>{selectedRows.length} selected</span>
          <button className="btn sm" disabled={!!busy || !selectedRows.length} onClick={verifyRows}>
            {busy === 'run' ? 'Queuing…' : 'Verify selected'}
          </button>
        </div>
      </div>

      <table style={{ marginTop:10 }}>
        <thead><tr>
          <th style={{ width:36 }}>
            <input type="checkbox" aria-label="Select all shown"
              checked={preview.length > 0 && preview.every(c => selectedRows.includes(c._id))}
              onChange={e => setSelectedRows(e.target.checked ? preview.map(c => c._id) : [])} />
          </th>
          <th>Contact</th><th>Lists</th><th>Result</th><th>Checked</th><th></th>
        </tr></thead>
        <tbody>
          {preview.map(c => <tr key={c._id}>
            <td><input type="checkbox" aria-label={`Select ${c.email}`}
              checked={selectedRows.includes(c._id)}
              onChange={() => setSelectedRows(v => v.includes(c._id) ? v.filter(x => x !== c._id) : [...v, c._id])} /></td>
            <td>
              <b style={{ fontSize:13 }}>{c.firstName || (c.email || '').split('@')[0]}</b>
              <div className="muted" style={{ fontSize:11 }}>{c.email}</div>
            </td>
            <td><div className="row" style={{ gap:4, flexWrap:'wrap' }}>
              {(c.listIds || []).slice(0, 2).map(id => <span className="badge" key={id}>{listMap[id]?.name || 'list'}</span>)}
              {(c.listIds || []).length > 2 && <span className="muted" style={{ fontSize:11 }}>+{c.listIds.length - 2}</span>}
              {!(c.listIds || []).length && <span className="muted" style={{ fontSize:11 }}>—</span>}
            </div></td>
            <td>{(() => { const v = effVerification(c); return v
              ? <span className={`badge ${{ VALID:'ok', INVALID:'danger', CATCH_ALL:'warn', RISKY:'warn', ERROR:'warn', PENDING:'', UNKNOWN:'' }[v.status] || ''}`}
                  title={v.reason || ''}>
                  {v.status === 'CATCH_ALL' ? 'catch-all' : v.status.toLowerCase()}
                </span>
              : <span className="muted" style={{ fontSize:11 }}>not checked</span>; })()}</td>
            <td className="muted" style={{ fontSize:11.5 }}>
              {c.verification?.verifiedAt ? new Date(c.verification.verifiedAt).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
            </td>
            <td>
              {c.verification?.status !== 'VALID' && <button className="btn ghost sm" disabled={!!busy}
                onClick={() => runVerify({ contactIds: [c._id], ...(force ? { force: true } : {}) }, 'Contact queued')}>
                Verify
              </button>}
            </td>
          </tr>)}
          {!preview.length && <tr><td colSpan={6}><div className="empty">
            {statusFilter ? 'Nothing with this status.' : 'No checks yet — pick some lists above to run your first verification.'}
          </div></td></tr>}
        </tbody>
      </table>
    </div>

    {/* ── RULES ── */}
    <div className="card" style={{ marginTop:14 }}>
      <h2 style={{ margin:0, fontSize:16 }}>How credits work</h2>
      <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:10 }}>
        <span className="chip">1 credit = 1 address checked</span>
        <span className="chip">Duplicates free</span>
        <span className="chip">Fresh re-checks free</span>
        <span className="chip">“Unknown” refunded automatically</span>
        <span className="chip">Errors refunded · auto-retried</span>
        <span className="chip">Credits never expire</span>
        <span className="chip">Bounce / unsub / complaint protection always free</span>
        <span className="chip">Plans include none — credits come from packs only</span>
      </div>
      <p className="muted" style={{ fontSize:12, marginTop:10, marginBottom:0 }}>
        How a check runs: syntax → disposable/role/typo dictionaries → <b>DNS MX/A lookup</b> →
        per-domain <b>SMTP catch-all probe</b> → on strict domains a direct <b>SMTP RCPT check of
        the mailbox itself</b> (server accepts = proven deliverable, server rejects 5xx = invalid).
        Bounced/complained history always overrides everything — for free. No verifier can honestly
        promise 100% accuracy, and we never claim it.
      </p>
    </div>
  </>;
}

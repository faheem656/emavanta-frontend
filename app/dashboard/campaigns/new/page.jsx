'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { get, post, patch } from '../../../../lib/api';
import Modal from '../../../../components/Modal';
import SlideOver from '../../../../components/SlideOver';
import TemplateBuilder from '../../../../components/TemplateBuilder';
import Icon from '../../../../components/Icon';
import { useToast } from '../../../../components/ToastProvider';
import { notify } from '../../../../lib/notify';
import useDraft, { agoText, clearDraft } from '../../../../lib/useDraft';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const stepLabel = s => s.type === 'email' ? 'Send an email' : s.type === 'delay' ? `Wait ${s.days || 2} day(s)` : (s.condition || 'Check a condition');
const STEPS = ['Overview', 'How it sends', 'Audience', 'Content', 'Review & launch'];

/** Every IANA zone the browser knows, so the wizard works anywhere in the world. */
const TIMEZONE_OPTIONS = (() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    if (Array.isArray(zones) && zones.length) return zones;
  } catch { /* older browsers fall back to the curated list below */ }
  return [
    'Asia/Karachi', 'UTC', 'Asia/Dubai', 'Asia/Kolkata',
    'Europe/London', 'Europe/Berlin', 'America/New_York',
    'America/Chicago', 'America/Los_Angeles', 'Asia/Singapore',
    'Australia/Sydney'
  ];
})();

const WEEKDAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' }
];
// <input type="datetime-local"> wants local time as YYYY-MM-DDTHH:mm.
const datetimeLocalValue = ms => {
  const d = new Date(ms); d.setSeconds(0, 0);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const GAP_PRESETS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 }
];

const INITIAL = {
  name: '', description: '', stream: 'outreach', templateId: '', accountPool: [], sendMode: 'human', gapSeconds: 45,
  rotation: 'round_robin', minDelaySec: 45, maxDelaySec: 90, dailyCap: 50, listIds: [], segmentIds: [],
  schedule: 'now', startAt: '', subject: '', preheader: '',
  timezone: '', startTime: '09:00', endTime: '17:00', daysOfWeek: [1, 2, 3, 4, 5],
  sequenceSteps: []
};

export default function NewCampaign() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [segments, setSegments] = useState([]);
  const [testTo, setTestTo] = useState('');
  const [testInfo, setTestInfo] = useState(null);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [launchInfo, setLaunchInfo] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newTpl, setNewTpl] = useState(null); // the full template editor, opened over the wizard
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL);

  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setForm(current => ({
      ...current,
      timezone: current.timezone || browserTimezone
    }));
  }, []);

  // Everything the wizard holds, saved as one blob (draft resumption needs both).
  const draftState = useMemo(() => ({ step, form }), [step, form]);
  const draft = useDraft({
    state: draftState,
    enabled: !created,
    onRestore: (state) => {
      if (!state) return;
      if (state.form) setForm(f => ({ ...INITIAL, ...f, ...state.form }));
      if (Number.isInteger(state.step)) setStep(Math.min(STEPS.length - 1, state.step));
    }
  });

  useEffect(() => {
    Promise.all([get('/accounts'), get('/templates'), get('/contacts/lists'), get('/segments')])
      .then(([a, t, l, sg]) => {
        const acc = arr(a), tpl = arr(t), ls = arr(l), segs = arr(sg);
        setAccounts(acc); setTemplates(tpl); setLists(ls); setSegments(segs);
        setForm(f => {
          const eligible = acc.filter(a => a.status === 'active' && (!a.stream || a.stream === f.stream)
            && (!a.tokenExpiresAt || Date.parse(a.tokenExpiresAt) > Date.now()));
          const eligibleIds = new Set(eligible.map(a => a._id));
          return {
            ...f,
            templateId: f.templateId || tpl[0]?._id || '',
            accountPool: f.accountPool.length ? f.accountPool.filter(id => eligibleIds.has(id)) : eligible.slice(0, 1).map(x => x._id),
            listIds: f.listIds.length ? f.listIds : ls.slice(0, 1).map(x => x._id),
            sequenceSteps: (f.sequenceSteps || []).map(s => s.type === 'email'
              ? { ...s, templateId: s.templateId || f.templateId || tpl[0]?._id || '', accountId: s.accountId || eligible[0]?._id }
              : s)
          };
        });
      })
      .catch(e => notify(toast, e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  const setStepAt = (i, patch) => setForm(f => ({ ...f, sequenceSteps: f.sequenceSteps.map((s, j) => j === i ? { ...s, ...patch } : s) }));
  const addStep = (type) => {
    const s = type === 'email' ? { type, templateId: form.templateId, accountId: form.accountPool[0] }
      : type === 'delay' ? { type, days: 2 } : { type, condition: 'If opened → continue, otherwise wait' };
    setForm(f => ({ ...f, sequenceSteps: [...f.sequenceSteps, s] }));
    setSelected(form.sequenceSteps.length);
  };
  const removeStep = i => setForm(f => ({ ...f, sequenceSteps: f.sequenceSteps.filter((_, j) => j !== i) }));
  const moveStep = (i, dir) => setForm(f => {
    const j = i + dir; if (j < 0 || j >= f.sequenceSteps.length) return f;
    const steps = [...f.sequenceSteps]; [steps[i], steps[j]] = [steps[j], steps[i]];
    return { ...f, sequenceSteps: steps };
  });
  const toggleList = id => setForm(f => ({ ...f, listIds: f.listIds.includes(id) ? f.listIds.filter(x => x !== id) : [...f.listIds, id] }));
  const toggleSegment = id => setForm(f => ({ ...f, segmentIds: f.segmentIds.includes(id) ? f.segmentIds.filter(x => x !== id) : [...f.segmentIds, id] }));
  const toggleScheduleDay = day => setForm(current => ({
    ...current,
    daysOfWeek: current.daysOfWeek.includes(day)
      ? current.daysOfWeek.filter(value => value !== day)
      : [...current.daysOfWeek, day].sort((a, b) => a - b)
  }));

  /* ---------------- pacing maths (plain language) ---------------- */
  const recipients = lists.filter(l => form.listIds.includes(l._id)).reduce((n, l) => n + (l.count || 0), 0);
  // Human-paced is the default; blast is an explicit choice that drains the list at plan speed.
  const blast = form.sendMode === 'blast';
  const gap = Math.max(5, Number(form.gapSeconds) || 45);
  const perHour = blast ? null : Math.max(1, Math.round(3600 / gap));
  const perDay = blast ? null : Math.min(perHour * 24, Number(form.dailyCap) || 50);
  const etaHours = !blast && recipients ? Math.max(1, Math.ceil(recipients / perHour)) : 0;
  const etaDays = !blast && recipients ? Math.max(1, Math.ceil(recipients / perDay)) : 0;

  const active = form.sequenceSteps[selected] || {};
  const selectedTemplate = templates.find(t => t._id === form.templateId) || null;
  const availableAccounts = accounts.filter(a => a.status === 'active' && (!a.stream || a.stream === form.stream)
    && (!a.tokenExpiresAt || Date.parse(a.tokenExpiresAt) > Date.now()));
  const availableAccountIds = new Set(availableAccounts.map(a => a._id));

  const payload = () => ({
    name: form.name.trim() || 'Untitled campaign', description: form.description.trim(), stream: form.stream,
    sendMode: form.sendMode, ...(blast ? {} : { gapSeconds: gap }),
    templateId: form.templateId,
    listIds: form.listIds,
    accountPool: form.accountPool,
    rotation: form.rotation,
    sendPolicy: {
      // Blast: near-zero delay between sends, big caps, no reply-pause — exactly
      // what the blast card promises (gap fields are omitted entirely: a null
      // gapSeconds fails validation).
      minDelaySec: blast ? 10 : Math.max(5, Math.round(gap * 0.8)),
      maxDelaySec: blast ? 15 : Math.max(10, Math.round(gap * 1.2)),
      jitterPct: blast ? 0 : 20,
      dailyCap: blast ? 5000 : Number(form.dailyCap) || 50,
      weeklyCap: blast ? 35000 : (Number(form.dailyCap) || 50) * 5,
      pauseOnReply: !blast,
      timezone: form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      // Blast has no window picker — it sends around the clock (Send now works
      // at any hour); the daily caps are what throttle it. Human keeps the
      // user-chosen working window.
      schedule: blast ? { startTime: '00:00', endTime: '24:00', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] } : {
        startTime: form.startTime,
        endTime: form.endTime,
        daysOfWeek: form.daysOfWeek
      },
      activeHours: blast ? { start: 0, end: 24 } : {
        start: Number(form.startTime.split(':')[0]),
        end: Math.min(24, Number(form.endTime.split(':')[0]) + (form.endTime.endsWith(':00') ? 0 : 1))
      },
      weekend: blast ? true : (form.daysOfWeek.includes(6) || form.daysOfWeek.includes(7))
    },
    sequenceSteps: []
  });

  const validate = () => {
    if (form.name.trim().length < 2) { toast({ title: 'Name your campaign', level: 'warn', message: 'Give it a name so you can find it later.' }); return false; }
    if (!payload().listIds.length) { toast({ title: 'Pick at least one list', level: 'warn', message: 'The Audience step needs at least one list.' }); return false; }
    if (!payload().accountPool.length || payload().accountPool.some(id => !availableAccountIds.has(id))) {
      toast({ title: 'Choose an active sender pool', level: 'warn', message: 'Select one or more verified mailboxes that support this campaign’s stream.' }); return false;
    }
    if (!payload().templateId) { toast({ title: 'Choose an email', level: 'warn', message: 'Pick a template — or create one on the Content step.' }); return false; }
    if (!blast && (!form.daysOfWeek.length || form.startTime >= form.endTime)) {
      toast({ title: 'Check sending schedule', level: 'warn', message: 'Choose at least one day and make sure the end time is later than the start time.' });
      return false;
    }
    if (blast && form.schedule === 'later') {
      const t = Date.parse(form.startAt || '');
      if (!form.startAt || !Number.isFinite(t)) { toast({ title: 'Pick a start time', level: 'warn', message: 'Choose when this blast should start.' }); return false; }
      if (t < Date.now() + 60000) { toast({ title: 'Pick a future time', level: 'warn', message: 'The schedule must be at least a minute ahead.' }); return false; }
      if (t > Date.now() + 90 * 24 * 3600 * 1000) { toast({ title: 'Too far ahead', level: 'warn', message: 'You can schedule up to 90 days ahead.' }); return false; }
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return null;
    setSaving(true);
    try {
      const c = created ? await patch(`/campaigns/${created._id}`, payload()) : await post('/campaigns', payload());
      setCreated(c);
      toast('Campaign saved as a draft');
      return c;
    } catch (e) { notify(toast, e); return null; }
    finally { setSaving(false); }
  };

  const runPreflight = async () => {
    const c = await saveDraft(); if (!c) return;
    try { setPreflight(await post(`/campaigns/${c._id}/preflight`, {})); } catch (e) { notify(toast, e); }
  };
  const askLaunch = async () => {
    const c = await saveDraft(); if (!c) return;
    try { const info = await post(`/campaigns/${c._id}/launch`, { confirm: false }); setLaunchInfo(info); setConfirmOpen(true); }
    catch (e) { notify(toast, e); }
  };
  const confirmLaunch = async () => {
    try {
      const scheduleFor = blast && form.schedule === 'later' ? new Date(form.startAt).toISOString() : null;
      const r = await post(`/campaigns/${created._id}/launch`, { confirm: true, ...(scheduleFor ? { startAt: scheduleFor } : {}) });
      toast(r.message || `${r.queued || 0} recipients queued — ${blast ? 'blast' : 'human-paced'} sending`);
      setConfirmOpen(false);
      clearDraft();
      router.push(`/dashboard/campaigns/${created._id}`);
    } catch (e) { notify(toast, e); }
  };

  /* ---------------- template creation inside the wizard ---------------- */
  // The full Templates-page editor opens in a wide slide-over; it selects whatever it saves.
  const openNewTemplate = () => setNewTpl({ open: true });

  /* ---------------- autosave badge ---------------- */
  const saveChip = () => {
    if (draft.status === 'saving') return <span className="autosave saving"><span className="spinner" /> Saving…</span>;
    if (draft.status === 'saved') return <span className="autosave ok"><Icon name="check" size={11} /> Saved {draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>;
    if (draft.status === 'local') return <span className="autosave local"><Icon name="shield" size={11} /> Saved on this device</span>;
    return <span className="autosave">{loading ? 'Preparing workspace…' : 'Autosave on'}</span>;
  };

  return <>
    <div className="wizard-topbar">
      <div className="row"><Link className="icon-btn" href="/dashboard/campaigns" title="Back"><Icon name="chevron" size={16} /></Link>
        <img className="wizard-logo" src="/emavanta-logo.webp" alt="Emavanta" />
        <span className="wizard-divider" />
        <input className="wizard-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name this campaign" />
        <span className={`badge ${blast ? '' : 'ok'}`}>{blast ? 'blast' : 'human-paced'}</span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        {saveChip()}
        <button className="btn ghost sm" onClick={saveDraft} disabled={saving}>Save draft</button>
        <button className="btn sm" onClick={() => step < STEPS.length - 1 ? setStep(step + 1) : askLaunch()}>
          {step < STEPS.length - 1 ? 'Next step' : 'Review & launch'}</button>
      </div>
    </div>
    <div className="wizard-steps"><div className="wizard-stepper">{STEPS.map((label, i) => <button key={label} className={step === i ? 'active' : ''} onClick={() => setStep(i)}>
      <span>{i + 1}</span>{label}</button>)}</div></div>

    {draft.restored && <div className="draft-banner">
      <Icon name="clock" size={14} />
      <span><b>Draft restored</b> — we picked up where you stopped ({agoText(draft.restored)}). Nothing was lost.</span>
      <button className="btn ghost sm" onClick={async () => {
        await draft.discard();
        setForm(INITIAL); setStep(0); setCreated(null);
        toast('Started a fresh campaign');
      }}>Start fresh</button>
      <button className="icon-btn sm" title="Dismiss" onClick={() => draft.discard()}><Icon name="close" size={12} /></button>
    </div>}

    {step === 0 && <div className="campaign-overview card luxe-card">
      <span className="template-eyebrow">CAMPAIGN WORKSPACE</span><h2>Plan a thoughtful send.</h2>
      <p className="muted">This campaign sends one selected template to contacts in your selected lists. Choose the sending pace, audience and content, then run preflight before launch.</p>
      <div className="campaign-overview-grid"><div><b>01 · Sending</b><p>{blast ? 'Blast delivery — the whole list at plan speed.' : 'Human-paced delivery — one email at a time.'}</p></div><div><b>02 · Audience</b><p>Select lists and connected mailboxes.</p></div><div><b>03 · Content</b><p>Choose or create a reusable email.</p></div><div><b>04 · Review</b><p>Check your settings before confirming.</p></div></div>
      <div className="notice">Multi-step campaign sequences and conditions are not executed by this sender. This wizard launches a single email per recipient.</div>
    </div>}

    {/* ---------------- the new step: how it sends ---------------- */}
    {step === 1 && <div className="wizard-shell">
      <div className="wizard-canvas">
        <div className="canvas-label">How should this campaign send?</div>
        <div className="mode-grid">
          <button className={`mode-card ${!blast ? 'active' : ''}`} onClick={() => setForm({ ...form, sendMode: 'human' })}>
            <span className="mode-icon"><Icon name="clock" size={20} /></span>
            <b>Human-paced sending</b>
            <span className="muted">One email at a time, with a natural pause in between — exactly how a person would send. Recommended for outreach and follow-ups.</span>
            <span className="mode-foot"><Icon name="shield" size={12} /> default · safest for reputation</span>
          </button>
          <button className={`mode-card ${blast ? 'active' : ''}`} onClick={() => setForm({ ...form, sendMode: 'blast' })}>
            <span className="mode-icon"><Icon name="bolt" size={20} /></span>
            <b>Blast sending</b>
            <span className="muted">Every contact goes out back-to-back as fast as your mailboxes allow — the whole list can finish in minutes. Daily caps still stop it for the day.</span>
            <span className="mode-foot"><Icon name="send" size={12} /> fastest · announcements &amp; first-touch</span>
          </button>
        </div>

        {!blast && <div className="card luxe-card" style={{ padding: 18, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>When should emails be sent?</h3>
          <p className="muted" style={{ marginTop: -4 }}>
            Your campaign will only send during this time window, regardless of the sending mode.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label>Timezone</label>
            <select value={form.timezone || 'UTC'} onChange={e => setForm({ ...form, timezone: e.target.value })}>
              {[...new Set([form.timezone, ...TIMEZONE_OPTIONS].filter(Boolean))].map(zone =>
                <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>
              )}
            </select>
          </div>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: '1 1 140px' }}>
              <label>Start time</label>
              <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label>End time</label>
              <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <label>Sending days</label>
          <div className="row" style={{ gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
            {WEEKDAYS.map(day => (
              <button key={day.value} type="button"
                className={`chip ${form.daysOfWeek.includes(day.value) ? 'chip-active' : ''}`}
                onClick={() => toggleScheduleDay(day.value)}>
                {day.label}
              </button>
            ))}
          </div>
          <div className="notice" style={{ marginTop: 14 }}>
            Emails are allowed from <b>{form.startTime}</b> to <b>{form.endTime}</b> ({form.timezone || 'your timezone'}).
            {' '}Selected days: <b>{form.daysOfWeek.length ? WEEKDAYS.filter(day => form.daysOfWeek.includes(day.value)).map(day => day.label).join(', ') : 'none'}</b>.
          </div>
        </div>}

        {blast && <div className="card luxe-card" style={{ padding: 18, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>When should this blast send?</h3>
          <p className="muted" style={{ marginTop: -4 }}>Send now for an immediate blast, or schedule it to start automatically at a chosen time.</p>
          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className={`chip ${form.schedule !== 'later' ? 'chip-active' : ''}`}
              onClick={() => setForm(f => ({ ...f, schedule: 'now' }))}>
              <Icon name="send" size={13} /> Send now</button>
            <button type="button" className={`chip ${form.schedule === 'later' ? 'chip-active' : ''}`}
              onClick={() => setForm(f => ({ ...f, schedule: 'later' }))}>
              <Icon name="clock" size={13} /> Schedule</button>
          </div>
          {form.schedule === 'later' && <div style={{ marginTop: 14 }}>
            <label>Start at</label>
            <input type="datetime-local" value={form.startAt || ''}
              min={datetimeLocalValue(Date.now() + 10 * 60000)}
              onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} />
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Starts automatically at this time (your device timezone). Nothing sends before that.
            </p>
          </div>}
          <div className="notice" style={{ marginTop: 14 }}>
            {form.schedule === 'later'
              ? <>Starts <b>{form.startAt ? new Date(form.startAt).toLocaleString() : '—'}</b>. Sending still stops at daily limits and resumes the next day.</>
              : <>Goes out <b>immediately</b> after confirmation — as fast as your mailboxes allow, stopping at daily limits for the day.</>}
          </div>
        </div>}

        {!blast && <div className="card luxe-card" style={{ padding: 18, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>How long between two emails?</h3>
          <p className="muted" style={{ marginTop: -4 }}>A random pause of ±20% is added around this number so the pattern never looks mechanical.</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {GAP_PRESETS.map(p => <button key={p.value} className={`chip ${Number(form.gapSeconds) === p.value ? 'chip-active' : ''}`}
              onClick={() => setForm({ ...form, gapSeconds: p.value })}>{p.label}</button>)}
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
            <div style={{ width: 170 }}><label>Custom pause</label>
              <div className="row" style={{ gap: 6 }}><input type="number" min={5} max={3600} value={form.gapSeconds}
                onChange={e => setForm({ ...form, gapSeconds: Math.max(5, Number(e.target.value) || 5) })} /><span className="muted">sec</span></div>
            </div>
            <div style={{ width: 150 }}><label>Daily cap</label>
              <input type="number" min={1} value={form.dailyCap} onChange={e => setForm({ ...form, dailyCap: Number(e.target.value) || 1 })} /></div>
          </div>
          <div className="notice" style={{ marginTop: 14 }}>
            One email every <b>{gap}s</b> is about <b>{perHour} emails per hour</b>, with a cap of <b>{perDay} per day</b>.
            {recipients ? <> Your <b>{recipients}</b> recipients take roughly <b>{etaHours} hour{etaHours === 1 ? '' : 's'}</b>{etaDays > 1 ? ` — about ${etaDays} days` : ' — within a day'}.</> : ''}
            {' '}Sending only happens inside working hours, and weekends are skipped.
          </div>
        </div>}

        {blast && <div className="notice warn" style={{ marginTop: 16 }}>
          <b>Blast sends as fast as your mailboxes allow — no window picker.</b> Daily caps still stop it for the day and it resumes the next day. Nothing sends until you confirm on the last step.
        </div>}
      </div>

      <aside className="wizard-panel">
        <h2>What this changes</h2>
        <div className="check-list">
          <div className="check-row"><span className="check-dot ok">✓</span>{blast ? 'All recipients queued at once' : `One email every ~${gap}s`}</div>
          {!blast && <div className="check-row"><span className="check-dot ok">?</span>{form.startTime} to {form.endTime} ({form.timezone || 'selected timezone'})</div>}
          {!blast && <div className="check-row"><span className="check-dot ok">?</span>{WEEKDAYS.filter(day => form.daysOfWeek.includes(day.value)).map(day => day.label).join(', ') || 'No days selected'}</div>}
          {blast && <div className="check-row"><span className="check-dot ok">✓</span>{form.schedule === 'later'
            ? `Scheduled — starts ${form.startAt ? new Date(form.startAt).toLocaleString() : '…'}`
            : 'Send now — starts right after confirmation'}</div>}
          <div className="check-row"><span className="check-dot ok">✓</span>bounces &amp; replies tracked either way</div>
        </div>
        <div className="divider" />
        <p className="muted" style={{ fontSize: 12 }}>
          Your provider&apos;s own rate limits and your daily cap always apply, so no mode can flood a mailbox.
          You can pause a running campaign at any time.
        </p>
      </aside>
    </div>}

    {step === 2 && <div className="wizard-shell">
      <div className="wizard-canvas">
        <div className="canvas-label">Choose lead lists</div>
        <div className="lead-grid">
          {lists.map(l => <button key={l._id} className={`lead-card ${form.listIds.includes(l._id) ? 'active' : ''}`} onClick={() => toggleList(l._id)}>
            <span className="lead-check">{form.listIds.includes(l._id) ? <Icon name="check" size={14} /> : ''}</span>
            <span className="lead-icon"><Icon name="contacts" size={20} /></span>
            <b>{l.name}</b><span className="muted">{l.count || 0} contacts</span>
          </button>)}
          {!lists.length && <div className="empty">Create a list in Contacts first.</div>}
        </div>
        <p className="muted" style={{marginTop:16}}>Selected <b>{form.listIds.length}</b> list(s) · approximately <b>{recipients}</b> list memberships. Overlapping contacts may be counted more than once here.</p>
        <div className="notice">Campaign targeting currently uses lists only; saved segments are not applied.</div>
      </div>
      <aside className="wizard-panel">
        <h2>Campaign settings</h2>
        <label>Campaign name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label style={{ marginTop: 12 }}>Mail stream</label>
        <select value={form.stream} onChange={e => {
          const stream = e.target.value;
          const allowed = new Set(accounts.filter(a => a.status === 'active' && (!a.stream || a.stream === stream)
            && (!a.tokenExpiresAt || Date.parse(a.tokenExpiresAt) > Date.now())).map(a => a._id));
          setForm(f => ({ ...f, stream, accountPool: f.accountPool.filter(id => allowed.has(id)) }));
        }}>
          {['outreach', 'marketing', 'transactional'].map(x => <option key={x}>{x}</option>)}</select>
        <label style={{ marginTop: 12 }}>Verified sending mailboxes <span className="muted">({form.accountPool.length} selected)</span></label>
        <p className="muted" style={{ fontSize: 11.5 }}>Select multiple senders. Round robin automatically assigns the next recipient to the next eligible mailbox.</p>
        <div className="picker">{availableAccounts.length ? availableAccounts.map(a => <label key={a._id} className="pick"><input type="checkbox"
          checked={form.accountPool.includes(a._id)} onChange={() => setForm(f => ({ ...f, accountPool: f.accountPool.includes(a._id) ? f.accountPool.filter(x => x !== a._id) : [...f.accountPool, a._id] }))} />{a.fromEmail}</label>)
          : <span className="muted">No active mailbox supports this stream. <Link href="/dashboard/accounts">Connect or verify a sender</Link>.</span>}</div>
        <label style={{ marginTop: 12 }}>Account rotation</label>
        <select value={form.rotation} onChange={e => setForm({ ...form, rotation: e.target.value })}>
          {[['round_robin','Round robin · rotate per recipient'],['least_used','Least used'],['weighted','Weighted'],['random_jitter','Randomized'],['sticky_by_contact','Sticky · same mailbox per contact']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      </aside>
    </div>}

    {step === 3 && <div className="wizard-shell">
      <div className="wizard-canvas">
        <div className="canvas-label">Email content</div>
        <div className="card luxe-card" style={{ padding: 18 }}>
          <div className="mini-row"><h2 style={{ margin: 0 }}>Choose the email</h2>
            <button className="btn secondary sm" onClick={openNewTemplate}><Icon name="plus" size={13} /> New template</button></div>
          <div className="tpl-pick-grid">
            {templates.map(t => <button key={t._id} className={`tpl-pick ${form.templateId === t._id ? 'active' : ''}`}
              onClick={() => setForm({ ...form, templateId: t._id })}>
              <span className="tpl-pick-top"><b>{t.name}</b>{form.templateId === t._id && <Icon name="check" size={14} />}</span>
              <span className="muted">{t.subject || 'No subject yet'}</span>
            </button>)}
            {!templates.length && <div className="empty">No templates yet — create your first one right here.</div>}
          </div>
          {selectedTemplate && <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Selected: <b>{selectedTemplate.name}</b> · <Link href={`/dashboard/templates?id=${selectedTemplate._id}`}>open the visual builder</Link>
          </p>}
          <p className="muted" style={{marginTop:14}}>The campaign uses the subject saved on the selected template. Edit the template to change it.</p>
          <div className="notice ok" style={{ marginTop: 14 }}>
            Tracking opens, clicks and unsubscribes is added to every send automatically — no token setup needed.
          </div>
        </div>

        <div className="notice" style={{marginTop:14}}>
          {blast && form.schedule === 'later'
            ? <>After confirmation this campaign <b>arms itself</b> and starts automatically at <b>{form.startAt ? new Date(form.startAt).toLocaleString() : 'the chosen time'}</b>.</>
            : <>Launch starts immediately after confirmation{blast ? ' — sending stops at daily limits and resumes the next day.' : '.'}</>}
        </div>
      </div>
      <aside className="wizard-panel">
        <h2>Send a test</h2>
        <p className="muted">Send one real email through the selected mailbox before you launch.</p>
        <label>Send to</label>
        <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@yourdomain.com" />
        <button className="btn secondary sm" style={{ marginTop: 10 }} onClick={async () => {
          const c = await saveDraft(); if (!c) return;
          try { const r = await post(`/campaigns/${c._id}/test-send`, { email: testTo }); setTestInfo(r); toast('Test email sent'); }
          catch (e) { notify(toast, e); }
        }}><Icon name="mail" size={14} /> Send test</button>
        {testInfo && <div className="notice ok" style={{ marginTop: 10 }}>Test queued to {testTo || 'your address'}. Tracking links included.</div>}
        <div className="divider" />
        <h3>Checklist</h3>
        <div className="check-list">
          {[['Template selected', !!form.templateId], ['Audience chosen', form.listIds.length > 0],
            ['Sender account', form.accountPool.length > 0], ['Sending mode chosen', !!form.sendMode]]
            .map(([label, ok]) => <div className="check-row" key={label}>
              <span className={`check-dot ${ok ? 'ok' : ''}`}>{ok ? '✓' : ''}</span>{label}</div>)}
        </div>
      </aside>
    </div>}

    {step === 4 && <div className="wizard-shell">
      <div className="wizard-canvas">
        <div className="canvas-label">Review &amp; launch</div>
        <div className="review-hero">
          <img src="/emavanta-logo.webp" alt="Emavanta" />
          <h2>{form.name || 'Untitled campaign'}</h2>
          <p className="muted">{form.stream} · {blast ? 'email blast' : 'human-paced'} · single email · approximately {recipients} list memberships</p>
        </div>
        <div className={`notice ${recipients ? '' : 'warn'}`} style={{ marginBottom: 14 }}>
          {recipients
            ? blast
              ? <>This campaign uses <b>blast mode</b>: emails go out back-to-back as fast as your mailboxes allow, stopping at daily limits. {form.schedule === 'later' ? <>Starts automatically <b>{new Date(form.startAt).toLocaleString()}</b>.</> : <>Nothing sends before confirmation.</>}</>
              : <>One email every <b>{gap}s</b> is about <b>{perHour} emails per hour</b>, capped at <b>{perDay} per day</b>. Sending is limited to {form.startTime}-{form.endTime} on your selected days ({form.timezone || 'selected timezone'}). Nothing sends until you confirm.</>
            : <>Pick at least one list on the Audience step and the finish time appears here.</>}
        </div>
        <div className="review-grid">
          {[['Audience', `${form.listIds.length} lists`, `~${recipients} list memberships`],
            ['Senders', `${form.accountPool.length} accounts`, form.rotation],
            ['Sending mode', blast ? 'Email blast' : 'Human-paced', blast ? 'as fast as possible' : `one every ~${gap}s`],
            ['Email', '1', 'selected template']].map(([k, v, n]) => <div key={k} className="review-card"><span className="stat-label">{k}</span><b>{v}</b><span className="muted">{n}</span></div>)}
        </div>
        <div className="card luxe-card" style={{ marginTop: 16, padding: 16 }}><h3>Selected email</h3><p className="muted">{selectedTemplate?.name || 'Choose a template'} · {selectedTemplate?.subject || 'No subject'}</p></div>
      </div>
      <aside className="wizard-panel">
        <h2>Final checks</h2>
        <p className="muted">Preflight verifies tokens, subject, unsubscribe link and template safety before anything is queued.</p>
        <button className="btn secondary sm" onClick={runPreflight}><Icon name="check" size={14} /> Run preflight</button>
        {preflight && <div className={`notice ${preflight.ok ? 'ok' : ''}`} style={{ marginTop: 12 }}>{preflight.ok ? 'All checks passed.' : `${(preflight.issues || []).length} item(s) to review.`}</div>}
        <div className="divider" />
        <h3>Ready?</h3>
        <p className="muted">Launch shows one final confirmation with recipient count, accounts, pace and quota. Nothing sends before that.</p>
        <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={askLaunch}><Icon name="bolt" size={15} /> Review &amp; launch</button>
      </aside>
    </div>}

    {confirmOpen && <Modal title={blast && form.schedule === 'later' ? 'Confirm schedule' : 'Confirm launch'} onClose={() => setConfirmOpen(false)}
      footer={<><button className="btn secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
        <button className="btn" onClick={confirmLaunch}>{blast && form.schedule === 'later' ? 'Schedule campaign' : 'Confirm &amp; queue'}</button></>}>
      <div className="confirm-grid">
        <div><div className="stat-label">Recipients</div><b>{launchInfo?.recipients ?? recipients}</b></div>
        <div><div className="stat-label">Sending mode</div><b>{launchInfo?.sendMode === 'blast' ? 'Blast' : 'Human-paced'}</b></div>
        <div><div className="stat-label">Accounts</div><b>{launchInfo?.accounts ?? form.accountPool.length}</b></div>
        <div><div className="stat-label">Quota</div><b>{launchInfo?.quota?.ok === false ? 'Exceeded' : 'Available'}</b></div>
      </div>
      {launchInfo?.pace?.text && <div className="notice" style={{ marginTop: 14 }}>{launchInfo.pace.text}.</div>}
      {launchInfo?.throughput && <div className="launch-scale">
        <div className="mini-row">
          <span className="stat-label">Your plan sends up to</span>
          <b>{Number(launchInfo.throughput.perHour).toLocaleString()} emails / hour</b>
        </div>
        <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>
          {Number(launchInfo.recipients || 0).toLocaleString()} contacts are added to the queue in batches of{' '}
          {Number(launchInfo.intakeChunk || 2000).toLocaleString()} — the launch returns immediately and sending
          continues in the background. Large audiences take longer and depend on your infrastructure and provider limits.
        </p>
      </div>}
    </Modal>}

    {newTpl && <SlideOver title="New template" width={1240}
      subtitle="The same editor as the Templates page — blocks, styling, live preview and code mode."
      onClose={() => setNewTpl(null)}
      footer={<>
        <span className="muted" style={{ marginRight: 'auto', fontSize: 12 }}>
          Saving selects this template for the campaign automatically.
        </span>
        <button className="btn secondary" onClick={() => setNewTpl(null)}>Close</button>
      </>}>
      <TemplateBuilder initial={null}
        onStarted={() => setNewTpl(t => ({ ...t, started: true }))}
        onSaved={saved => {
          if (!saved?._id) return;
          setTemplates(list => [saved, ...list.filter(t => t._id !== saved._id)]);
          setForm(f => ({ ...f, templateId: saved._id,
            sequenceSteps: f.sequenceSteps.map(s => s.type === 'email' ? { ...s, templateId: saved._id } : s) }));
          toast({ title: 'Template saved and selected', message: saved.name });
          setNewTpl(null);
        }} />
    </SlideOver>}
  </>;
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { get, post, patch } from '../lib/api';
import Icon from './Icon';
import SlideOver from './SlideOver';
import TemplateBuilder from './TemplateBuilder';
import { useToast } from './ToastProvider';
import { notify } from '../lib/notify';

const uid = () => Math.random().toString(36).slice(2, 9);
const TRIGGERS = [
  { value:'contact_added', label:'Contact is added to a list', hint:'Planned trigger: someone joins the selected list.' },
  { value:'form_submitted', label:'Form is submitted', hint:'Planned trigger: a hosted form submission.' },
  { value:'tag_added', label:'Tag is added', hint:'Planned trigger: a contact receives a tag.' },
  { value:'api', label:'API event', hint:'Planned trigger: an event from your app.' },
  { value:'manual', label:'Manual enrollment', hint:'Manual enrollment is not available yet.' }
];
const human = mins => {
  const m = Number(mins) || 0;
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  if (m % 1440 === 0) return `${m / 1440} day${m / 1440 === 1 ? '' : 's'}`;
  if (m % 60 === 0) return `${m / 60} hour${m / 60 === 1 ? '' : 's'}`;
  return `${Math.round((m / 60) * 10) / 10} hours`;
};
const toMinutes = (value, unit) => Number(value || 0) * (unit === 'days' ? 1440 : unit === 'hours' ? 60 : 1);
const fromMinutes = m => (m && m % 1440 === 0 ? { value:m / 1440, unit:'days' }
  : m && m % 60 === 0 ? { value:m / 60, unit:'hours' } : { value:m || 5, unit:'minutes' });

export default function WorkflowBuilder({ id = 'new' }) {
  const toast = useToast();
  const router = useRouter();
  const isNew = id === 'new';
  const [steps, setSteps] = useState([{ key:uid(), type:'email', templateId:'', subject:'' }]);
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [meta, setMeta] = useState({ name:'', description:'', trigger:'manual', listId:'', formId:'', accountId:'', status:'draft' });
  const [forms, setForms] = useState([]);
  const [newTpl, setNewTpl] = useState(null); // the step whose template is being created
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState('');
  const [saved, setSaved] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.all([get('/templates'), get('/contacts/lists'), get('/forms'), get('/accounts')]).then(([t, l, f, a]) => {
      setAccounts(Array.isArray(a) ? a : (a?.items || []));
      setTemplates(Array.isArray(t) ? t : []);
      setLists(Array.isArray(l) ? l : []);
      setForms(Array.isArray(f) ? f : (f?.items || []));
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    get(`/sequences/${id}`).then(s => {
      if (!s || Array.isArray(s) || !s._id) return;
      setMeta({ name:s.name || '', description:s.description || '', trigger:s.trigger || 'manual',
        listId:s.listId || '', formId:s.formId || '', accountId:s.accountId || '', status:s.status || 'draft' });
      setSteps((s.steps || [{ type:'email' }]).map(st => ({ key:uid(), type:st.type, templateId:st.templateId || '',
        subject:st.subject || '', condition:st.condition || '', accountId:st.accountId || '', ...fromMinutes(st.delayMinutes) })));
      setSaved(s);
    }).catch(e => notify(toast, e));
  }, [id]);

  const add = type => {
    const step = type === 'email' ? { key:uid(), type, templateId:'', subject:'' }
      : type === 'delay' ? { key:uid(), type, value:2, unit:'days' }
      : { key:uid(), type, condition:'If no reply → continue' };
    setSteps(s => [...s, step]); setSelected(steps.length); setDirty(true);
  };
  const update = (key, patchObj) => { setSteps(s => s.map(x => x.key === key ? { ...x, ...patchObj } : x)); setDirty(true); };
  const remove = key => { setSteps(s => s.filter(x => x.key !== key)); setSelected(0); setDirty(true); };
  const move = (key, dir) => {
    setSteps(s => {
      const i = s.findIndex(x => x.key === key), j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });
    setDirty(true);
  };

  const payload = () => ({
    name: meta.name.trim(), description: meta.description, trigger: meta.trigger,
    listId: meta.listId, formId: meta.formId,
    accountId: meta.accountId, status: meta.status,
    steps: steps.map(s => s.type === 'email'
      ? { type:'email', templateId:s.templateId || '', accountId:s.accountId || '', ...(s.subject ? { subject:s.subject } : {}) }
      : s.type === 'delay' ? { type:'delay', delayMinutes:toMinutes(s.value, s.unit) }
      : { type:'condition', condition:s.condition || 'If no reply → continue' })
  });

  const save = async ({ stay = true } = {}) => {
    if (meta.name.trim().length < 2) { toast('Give the automation a name first', 'warn'); return null; }
    if (!steps.length) { toast('Add at least one step', 'warn'); return null; }
    setBusy('save');
    try {
      const body = payload();
      const result = isNew && !saved
        ? await post('/sequences', body)
        : await patch(`/sequences/${saved?._id || id}`, body).then(() => ({ ...saved, ...body }));
      setSaved(result);
      setDirty(false);
      toast('Workflow configuration saved. Sending and activation are not available yet.');
      if (!stay && result?._id) router.push('/dashboard/automation');
      else if (isNew && result?._id) router.replace(`/dashboard/automation/${result._id}`);
      return result;
    } catch (e) { notify(toast, e); return null; }
    finally { setBusy(''); }
  };

  const active = steps[selected];
  const summary = useMemo(() => ({
    emails: steps.filter(s => s.type === 'email').length,
    waits: steps.filter(s => s.type === 'delay').length,
    total: steps.reduce((n, s) => n + (s.type === 'delay' ? toMinutes(s.value, s.unit) : 0), 0)
  }), [steps]);

  return <>
    <div className="wizard-topbar">
      <div className="row">
        <Link className="icon-btn" href="/dashboard/automation" title="Back to automations"><Icon name="chevron" size={16} /></Link>
        <img className="wizard-logo" src="/emavanta-logo.webp" alt="Emavanta" />
        <span className="wizard-divider" />
        <input className="wizard-name" placeholder="Name this automation" value={meta.name}
          onChange={e => { setMeta({ ...meta, name:e.target.value }); setDirty(true); }} />
        {dirty && <span className="badge warn">unsaved</span>}
        <span className={`badge ${meta.status === 'active' ? 'ok' : 'warn'}`}>{meta.status}</span>
      </div>
      <div className="row">
        <button className="btn ghost sm" onClick={() => save({ stay:true })} disabled={busy === 'save'}>
          {busy === 'save' ? 'Saving…' : meta.status === 'draft' ? 'Save draft' : 'Save changes'}</button>
        <button className="btn sm" onClick={() => save({ stay:false })} disabled={busy === 'save'}>
          <Icon name="check" size={14} /> Save &amp; finish</button>
      </div>
    </div>

    <div className="notice" style={{margin:'14px 0'}}><b>Workflow execution is not available yet.</b> You can design and save drafts, including sender preferences, but triggers, emails, waits and conditions will not run. Activation and enrollment are disabled. Existing active flows should be reviewed.</div>
    <div className="wizard-shell">
      <div className="wizard-canvas">
        <div className="canvas-label">Workflow</div>

        <div className="wf-node trigger">
          <span className="node-icon burst"><Icon name="bolt" size={17} /></span>
          <div className="node-body"><b>Trigger</b>
            <select value={meta.trigger} onChange={e => { setMeta({ ...meta, trigger:e.target.value }); setDirty(true); }}>
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <span className="muted">{TRIGGERS.find(t => t.value === meta.trigger)?.hint}</span>
          </div>
        </div>

        {(meta.trigger === 'form_submitted') && <div className="wf-branch">
          <span className="wf-branch-line" />
          <div className="wf-node inline">
            <span className="node-icon"><Icon name="mail" size={16} /></span>
            <div className="node-body"><b>Hosted form</b>
              <select value={meta.formId} onChange={e => { setMeta({ ...meta, formId:e.target.value }); setDirty(true); }}>
                <option value="">Pick a form…</option>
                {forms.map(f => <option key={f._id} value={f._id}>{f.name}{f.status === 'paused' ? ' (off)' : ''}</option>)}
              </select>
              <span className="muted">
                {forms.length ? 'Form trigger configuration only; execution is not available yet.' : (
                  <>No forms yet — <Link href="/dashboard/forms">build one in Forms</Link> first.</>
                )}
              </span>
            </div>
          </div>
        </div>}

        {(meta.trigger === 'contact_added') && <div className="wf-branch">
          <span className="wf-branch-line" />
          <div className="wf-node inline">
            <span className="node-icon"><Icon name="contacts" size={16} /></span>
            <div className="node-body"><b>List</b>
              <select value={meta.listId} onChange={e => { setMeta({ ...meta, listId:e.target.value }); setDirty(true); }}>
                <option value="">Any list</option>
                {lists.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>}

        {steps.map((s, i) => <div key={s.key}>
          <div className="wizard-connector"><span>+</span></div>
          <button className={`wizard-node ${selected === i ? 'active' : ''}`} onClick={() => setSelected(i)}>
            <span className="node-num">{i + 1}</span>
            <span className={`node-icon ${s.type}`}>{s.type === 'email' ? <Icon name="mail" size={17} />
              : s.type === 'delay' ? <Icon name="clock" size={17} /> : <Icon name="shield" size={17} />}</span>
            <span className="node-body">
              <b>{s.type === 'email' ? (s.subject || templates.find(t => t._id === s.templateId)?.name || 'Send an email') : s.type === 'delay' ? `Wait ${human(toMinutes(s.value, s.unit))}` : 'Condition'}</b>
              <span className="muted">{s.type === 'email' ? (templates.find(t => t._id === s.templateId)?.name || 'Pick a template')
                : s.type === 'delay' ? 'then continue the flow' : (s.condition || 'branch on behaviour')}</span>
            </span>
            <span className="row" style={{ gap:2 }} onClick={e => e.stopPropagation()}>
              <span className="icon-btn sm" onClick={() => move(s.key, -1)}>↑</span>
              <span className="icon-btn sm" onClick={() => move(s.key, 1)}>↓</span>
              <span className="icon-btn sm" onClick={() => remove(s.key)}><Icon name="close" size={12} /></span>
            </span>
          </button>
        </div>)}

        <div className="wizard-connector"><span>+</span></div>
        <div className="wizard-add">
          <button onClick={() => add('email')}><Icon name="mail" size={15} /> Email</button>
          <button onClick={() => add('delay')}><Icon name="clock" size={15} /> Wait</button>
          <button onClick={() => add('condition')}><Icon name="shield" size={15} /> Condition</button>
        </div>

        <div className="wf-goal">
          <Icon name="check" size={14} /> Draft workflow · execution not available yet
        </div>
      </div>

      <aside className="wizard-panel">
        <div className="mini-row"><div className="stat-label">Step {steps.indexOf(active) + 1} of {steps.length}</div>
          <span className="badge">{active?.type || 'trigger'}</span></div>
        <h2 style={{ marginTop:4 }}>{active?.type === 'email' ? 'Email step' : active?.type === 'delay' ? 'Wait step' : active?.type === 'condition' ? 'Condition' : 'Settings'}</h2>
        <div className="divider" />

        {active?.type === 'email' && <>
          <label>Sending account override</label>
          <select value={active.accountId || ''} onChange={e => update(active.key, { accountId:e.target.value })}>
            <option value="">Use workflow default</option>{accounts.map(a => <option key={a._id} value={a._id}>{a.fromEmail}</option>)}
          </select><p className="muted" style={{fontSize:11}}>Saved for future execution; no email is sent yet.</p>
          <label>Template</label>
          <select value={active.templateId} onChange={e => update(active.key, { templateId:e.target.value })}>
            <option value="">Choose a template…</option>
            {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <div className="row" style={{ marginTop:8, gap:8 }}>
            <button className="btn secondary sm" onClick={() => setNewTpl(active.key)}>
              <Icon name="plus" size={13} /> New template</button>
              <Link className="btn ghost sm" href="/dashboard/templates">Open templates</Link>
          </div>
          <p className="muted" style={{ fontSize:11.5, marginTop:6 }}>
            Builds inside this step — the same editor as the Templates page (blocks, styling, code mode, live preview).
            Saving picks it for this step automatically.
          </p>
          <label style={{ marginTop:12 }}>Subject override (optional)</label>
          <input value={active.subject || ''} onChange={e => update(active.key, { subject:e.target.value })}
            placeholder="Leave empty to use the template subject" />
          <div className="notice" style={{ marginTop:12 }}>Tokens like <code>{'{{first_name}}'}</code> are filled per contact, and the unsubscribe link is added automatically.</div>
        </>}

        {active?.type === 'delay' && <>
          <label>Wait for</label>
          <div className="row">
            <input type="number" min={1} style={{ width:110 }} value={active.value}
              onChange={e => update(active.key, { value:Math.max(1, Number(e.target.value) || 1) })} />
            <select style={{ width:130 }} value={active.unit} onChange={e => update(active.key, { unit:e.target.value })}>
              <option value="minutes">minutes</option><option value="hours">hours</option><option value="days">days</option>
            </select>
          </div>
          <p className="muted" style={{ marginTop:10 }}>Wait configuration only; timing is not executed yet.</p>
          <div className="row" style={{ gap:6, marginTop:8 }}>
            {[1, 2, 3].map(d => <button key={d} className="chip" onClick={() => update(active.key, { value:d, unit:'days' })}>{d} day{d > 1 ? 's' : ''}</button>)}
          </div>
        </>}

        {active?.type === 'condition' && <>
          <label>Condition</label>
          <select value={active.condition || 'If no reply → continue'} onChange={e => update(active.key, { condition:e.target.value })}>
            {['If no reply → continue', 'If opened → continue', 'If clicked → continue', 'If replied → stop', 'If not opened → continue'].map(c => <option key={c}>{c}</option>)}
          </select>
          <p className="muted" style={{ marginTop:10 }}>Condition configuration only; it is not evaluated yet.</p>
        </>}

        <div className="divider" />
        <label>Default sending account</label>
        <select value={meta.accountId} onChange={e => {setMeta({...meta, accountId:e.target.value});setDirty(true);}}><option value="">Choose a default mailbox…</option>{accounts.map(a=><option key={a._id} value={a._id}>{a.fromEmail}</option>)}</select>
        <p className="muted" style={{fontSize:11}}>Step-level mailbox selection overrides this preference when execution becomes available.</p>
        <label>Description</label>
        <textarea rows={2} style={{ width:'100%' }} value={meta.description}
          onChange={e => { setMeta({ ...meta, description:e.target.value }); setDirty(true); }} placeholder="What this workflow does" />
        <label style={{ marginTop:12 }}>Status</label>
        <div className="segmented">
          {['draft', 'paused'].map(s => <button key={s} className={meta.status === s ? 'active' : ''}
            onClick={() => { setMeta({ ...meta, status:s }); setDirty(true); }}>{s}</button>)}
        </div>

        <div className="divider" />
        <div className="wf-stats">
          <div><span className="stat-label">Emails</span><b>{summary.emails}</b></div>
          <div><span className="stat-label">Waits</span><b>{summary.waits}</b></div>
          <div><span className="stat-label">Total wait</span><b>{human(summary.total)}</b></div>
        </div>
      </aside>
    </div>

    {newTpl && <SlideOver title="New template" width={1240}
      subtitle="The same editor as the Templates page — blocks, styling, live preview and code mode."
      onClose={() => setNewTpl(null)}
      footer={<>
        <span className="muted" style={{ marginRight:'auto', fontSize:12 }}>
          Saving selects this template for step {steps.findIndex(x => x.key === newTpl) + 1} automatically.
        </span>
        <button className="btn secondary" onClick={() => setNewTpl(null)}>Close</button>
      </>}>
      <TemplateBuilder initial={null}
        onSaved={saved => {
          if (!saved?._id) return;
          setTemplates(list => [saved, ...list.filter(t => t._id !== saved._id)]);
          update(newTpl, { templateId: saved._id, subject: saved.subject || '' });
          toast({ title:'Template saved for this step', message: saved.name });
          setNewTpl(null);
        }} />
    </SlideOver>}
  </>;
}

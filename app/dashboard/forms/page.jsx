'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';
import { CardGridSkeleton, ListSkeleton } from '../../../components/DashboardSkeleton';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
const TYPE_LABELS = {
  text: 'Short text', email: 'Email', tel: 'Phone', textarea: 'Long text',
  select: 'Dropdown', number: 'Number', date: 'Date', checkbox: 'Checkbox'
};
const blankField = () => ({ key: `field_${Math.random().toString(36).slice(2, 6)}`, label: '', type: 'text', required: false, placeholder: '' });

const emptyDraft = () => ({
  name: '', headline: '', description: '', submitLabel: 'Subscribe',
  successMessage: 'Thanks — you are on the list.', redirectUrl: '',
  fields: [{ key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com', locked: true },
    { key: 'first_name', label: 'First name', type: 'text', required: false, placeholder: 'Dana' }],
  listId: '', automationId: '', tags: '', doubleOptIn: false,
  appearance: { accent: '#2563eb', layout: 'card' }
});

const toFormDraft = form => ({
  name: form.name || '', headline: form.headline || '', description: form.description || '',
  submitLabel: form.submitLabel || 'Subscribe', successMessage: form.successMessage || '',
  redirectUrl: form.redirectUrl || '', fields: form.fields || [], listId: form.listId || '',
  automationId: form.automationId || '', tags: (form.tags || []).join(', '), doubleOptIn: !!form.doubleOptIn,
  appearance: form.appearance || { accent: '#2563eb', layout: 'card' }
});

const categoryIcon = category => ({
  'Audience growth': 'mail', 'Sales & demos': 'bolt', Events: 'users',
  'Customer care': 'contacts', 'Product launch': 'send'
}[category] || 'folder');

export default function Forms() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ lists: [], automations: [] });
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [tab, setTab] = useState('build');
  const [subs, setSubs] = useState({ items: [], total: 0 });
  const [embed, setEmbed] = useState(null);
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStarterLibrary, setShowStarterLibrary] = useState(true);
  const [showNewList, setShowNewList] = useState(false);
  const [listName, setListName] = useState('');
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState('');

  const load = async ({ initial = false, ensureDefaults = false } = {}) => {
    if (initial) setLoading(true);
    let seedWarning = '';
    if (ensureDefaults) {
      try { await post('/forms/ensure-defaults', {}); }
      catch { seedWarning = 'Starter forms could not be refreshed. You can still create a blank form or try again.'; }
    }
    try {
      const [list, meta] = await Promise.all([get('/forms'), get('/forms/meta/options')]);
      const items = arr(list);
      setRows(items);
      setOptions({ lists: arr(meta?.lists), automations: arr(meta?.automations) });
      setLoadError(seedWarning);
      return items;
    } catch {
      setLoadError('Forms could not be loaded. Check your connection and refresh to try again.');
      return [];
    } finally { if (initial) setLoading(false); }
  };

  useEffect(() => { void load({ initial: true, ensureDefaults: true }); }, []);

  const active = useMemo(() => rows.find(r => r._id === activeId) || null, [rows, activeId]);
  const starterRows = useMemo(() => rows.filter(form => form.starterContent), [rows]);
  const visibleRows = useMemo(() => rows.filter(form => {
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    const matchesSearch = !search.trim() || `${form.name} ${form.starterCategory || ''} ${form.slug}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  }), [rows, search, statusFilter]);
  const stats = useMemo(() => ({
    total: rows.length,
    live: rows.filter(form => form.status === 'live').length,
    submissions: rows.reduce((total, form) => total + (Number(form.submissions) || 0), 0),
    views: rows.reduce((total, form) => total + (Number(form.views) || 0), 0)
  }), [rows]);

  const openForm = form => {
    setActiveId(form._id);
    setShowStarterLibrary(false);
    setTab('build');
    setDraft(toFormDraft(form));
    setSubs({ items: [], total: 0 });
    setEmbed(null);
  };

  const newForm = () => {
    setActiveId(null);
    setShowStarterLibrary(false);
    setDraft(emptyDraft());
    setTab('build');
    setEmbed(null);
  };

  const loadSubs = async id => {
    try {
      const r = await get(`/forms/${id}/submissions?limit=200`);
      setSubs({ items: arr(r?.items ? r.items : r), total: r?.total ?? arr(r?.items ? r.items : r).length });
    } catch (e) { notify(toast, e); }
  };

  const loadEmbed = async id => {
    try { setEmbed(await get(`/forms/${id}/embed?origin=${encodeURIComponent(window.location.origin)}`)); } catch (e) { notify(toast, e); }
  };

  const switchTab = next => {
    setTab(next);
    if (!activeId) return;
    if (next === 'subs') loadSubs(activeId);
    if (next === 'embed') loadEmbed(activeId);
  };

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const setField = (i, key, value) => setDraft(d => ({ ...d, fields: d.fields.map((f, j) => j === i ? { ...f, [key]: value } : f) }));

  const createList = async () => {
    const name = listName.trim();
    if (!name) { setListError('Enter a list name.'); return; }
    setListBusy(true); setListError('');
    try {
      const list = await post('/contacts/lists', { name });
      if (!list?._id) throw new Error('The list could not be created.');
      setOptions(o => ({ ...o, lists: [...o.lists, list] }));
      setDraft(d => ({ ...d, listId: list._id }));
      setListName(''); setShowNewList(false); toast('List created and selected. Save the form to keep this selection.');
    } catch (e) { setListError(e?.message || 'Could not create the list. Please try again.'); }
    finally { setListBusy(false); }
  };

  const save = async () => {
    if (draft.name.trim().length < 2) { toast('Give the form a name first', 'warn'); return; }
    if (!draft.fields.some(f => f.type === 'email')) { toast('A form needs an email field so replies can reach someone', 'warn'); return; }
    setBusy('save');
    try {
      const body = { ...draft, tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean),
        listId: draft.listId || null, automationId: draft.automationId || null };
      if (activeId) { await patch(`/forms/${activeId}`, body); toast('Form updated'); }
      else {
        const created = await post('/forms', body);
        toast('Form created — it is live on its own page now');
        await load();
        if (created?._id) openForm(created);
      }
      if (activeId) await load();
    } catch (e) { notify(toast, e); } finally { setBusy(''); }
  };

  const toggleStatus = async () => {
    if (!activeId) return;
    const status = active?.status === 'paused' ? 'live' : 'paused';
    setBusy('status');
    try {
      await patch(`/forms/${activeId}`, { status, ...(status === 'live' ? { deleted: false } : {}) });
      toast(status === 'live' ? 'Form is accepting responses again' : 'Form paused — the page stays up but stops taking responses');
      const items = await load();
      if (status === 'paused') setActiveId(activeId); else setActiveId(items.find(i => i._id === activeId)?._id || activeId);
    } catch (e) { notify(toast, e); } finally { setBusy(''); }
  };

  const remove = async form => {
    if (!window.confirm(`Delete “${form.name}”? The hosted page turns off; submissions you already collected stay available.`)) return;
    try {
      await del(`/forms/${form._id}`);
      toast('Form deleted — collected submissions are kept');
      if (activeId === form._id) newForm();
      await load();
    } catch (e) { notify(toast, e); }
  };

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); toast(`${what} copied`); }
    catch { toast('Copy failed — select the text and copy it manually', 'warn'); }
  };

  const exportCsv = async () => {
    try {
      const r = await get(`/forms/${activeId}/submissions?format=csv&limit=500`);
      if (!r?.csv) { toast('Nothing to export yet', 'warn'); return; }
      const blob = new Blob([r.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = r.filename || 'submissions.csv'; a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${r.total} submission(s)`);
    } catch (e) { notify(toast, e); }
  };

  const previewFields = draft.fields.filter(f => f.label);
  const accent = draft.appearance?.accent || '#2563eb';

  return <>
    <PageHead title="Forms & hosted pages"
      subtitle="Build polished signup pages, capture leads, and connect each form to the right audience."
      actions={<>
        <Link className="btn secondary sm" href="/dashboard/contacts"><Icon name="contacts" size={15} /> Contacts</Link>
        <button className="btn ghost sm" onClick={() => { setShowStarterLibrary(true); setTab('build'); }}><Icon name="folder" size={15} /> Starter library</button>
        <button className="btn sm" onClick={newForm}><Icon name="plus" size={15} /> New blank form</button>
      </>} />

    {loadError && <div className="notice warn" role="status" style={{ marginBottom: 14 }}>{loadError}</div>}

    <section className="fm-hero" aria-label="Forms overview">
      <div className="fm-hero-icon"><Icon name="inbox" size={22} /></div>
      <div className="fm-hero-copy">
        <span className="fm-eyebrow">CAPTURE · CONNECT · GROW</span>
        <h2>One form, a smoother path to your audience</h2>
        <p>Use a ready-made starting point, customize the fields and style, then share a hosted page or embed it on your site.</p>
      </div>
      <div className="fm-hero-note"><b>{loading ? 5 : starterRows.length} ready-made starters</b><span>Paused until you review and turn them on.</span></div>
    </section>

    <div className="fm-overview-stats" aria-label="Form statistics">
      {[
        { label: 'Total forms', value: stats.total, icon: 'folder', tone: 'blue' },
        { label: 'Accepting responses', value: stats.live, icon: 'check', tone: 'green' },
        { label: 'Submissions', value: stats.submissions.toLocaleString(), icon: 'inbox', tone: 'violet' },
        { label: 'Page views', value: stats.views.toLocaleString(), icon: 'eye', tone: 'amber' }
      ].map(item => <article className={`fm-overview-stat ${item.tone}`} key={item.label}>
        <span className="fm-overview-icon"><Icon name={item.icon} size={16} /></span>
        <span className="fm-overview-value">{item.value}</span>
        <span className="fm-overview-label">{item.label}</span>
      </article>)}
    </div>

    <div className="fm-grid">
      {/* ---------------------------------------------------------- */}
      <div className="card fm-library-card">
        <div className="fm-library-head">
          <div><h3>Your forms</h3><p>{rows.length} saved · {starterRows.length} starter{starterRows.length === 1 ? '' : 's'}</p></div>
          <button className="icon-btn sm" type="button" title="Refresh forms" onClick={() => void load()} disabled={loading}><Icon name="refresh" size={15} /></button>
        </div>
        <label className="fm-search">
          <Icon name="search" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a form" aria-label="Find a form" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><Icon name="close" size={13} /></button>}
        </label>
        <div className="fm-filter-row" role="group" aria-label="Filter forms by status">
          {[['all','All'],['live','Live'],['paused','Paused']].map(([value,label]) => <button key={value} type="button"
            className={statusFilter === value ? 'active' : ''} onClick={() => setStatusFilter(value)}>{label}
            <span>{value === 'all' ? rows.length : rows.filter(form => form.status === value).length}</span></button>)}
        </div>
        {loading ? <ListSkeleton count={4} />
          : rows.length === 0 ? <div className="fm-library-empty"><Icon name="inbox" size={23} /><b>Your form workspace is ready</b>
            <span>Start with one of the ready-made forms or create a blank form from scratch.</span>
            <button className="btn secondary sm" onClick={() => setShowStarterLibrary(true)}>Browse starter forms</button>
          </div>
          : visibleRows.length === 0 ? <div className="fm-library-empty compact"><b>No matches</b><span>Try another search or status filter.</span></div>
          : <div className="fm-list">
            {visibleRows.map(form => <button key={form._id} className={`fm-item ${form._id === activeId && !showStarterLibrary ? 'active' : ''}`} onClick={() => openForm(form)}>
              <div className="mini-row"><b>{form.name}</b><span className={`badge ${form.status === 'paused' ? 'warn' : 'ok'}`}>{form.status === 'paused' ? 'Paused' : 'Live'}</span></div>
              <span className="fm-item-meta">{form.starterContent && <span className="fm-starter-chip">Starter</span>}
                <span>{form.starterCategory || 'Custom form'}</span><span>·</span><span>{form.submissions ?? 0} submissions</span></span>
              <span className="fm-item-url">/f/{form.slug}</span>
            </button>)}
          </div>}
      </div>

      {/* ---------------------------------------------------------- */}
      <div>
        <div className="fm-tabs">
          {[['build', 'Build'], ['subs', `Submissions${active ? ` · ${active.submissions ?? 0}` : '' }`], ['embed', 'Embed']].map(([k, label]) =>
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => switchTab(k)}>{label}</button>)}
        </div>

        {tab === 'build' && showStarterLibrary && <StarterGallery forms={starterRows} loading={loading}
          onUse={openForm} onBlank={newForm} />}

        {tab === 'build' && !showStarterLibrary && <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,.85fr)', alignItems: 'start' }}>
          <div className="card luxe-card" style={{ padding: 16 }}>
            <div className="mini-row">
              <h3 style={{ margin: 0 }}>{activeId ? 'Edit form' : 'New form'}</h3>
              {activeId && <button className="btn ghost sm" onClick={toggleStatus} disabled={busy === 'status'}>
                {active?.status === 'paused' ? 'Turn on' : 'Pause'}</button>}
            </div>
            {active?.starterContent && <div className="fm-starter-callout"><span><Icon name="folder" size={15} /></span>
              <p><b>Starter form · {active.starterCategory}</b><br />This example is paused by default and has no audience list or automation attached. Review the content, connect what you need, then turn it on when you are ready.</p>
            </div>}

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div><label>Form name</label>
                <input style={{ width: '100%' }} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Newsletter signup" /></div>
              <div><label>Button label</label>
                <input style={{ width: '100%' }} value={draft.submitLabel} onChange={e => set('submitLabel', e.target.value)} placeholder="Subscribe" /></div>
            </div>
            <label style={{ marginTop: 10 }}>Headline</label>
            <input style={{ width: '100%' }} value={draft.headline} onChange={e => set('headline', e.target.value)} placeholder="Get the weekly brief" />
            <label style={{ marginTop: 10 }}>Description <span className="muted">(optional)</span></label>
            <input style={{ width: '100%' }} value={draft.description} onChange={e => set('description', e.target.value)} placeholder="One short line about what people get." />

            <h3 style={{ marginTop: 18 }}>Fields</h3>
            <p className="muted" style={{ fontSize: 11.5, margin: '0 0 8px' }}>Email is always collected — it is how the contact is identified.</p>
            {draft.fields.map((f, i) => <div className="fm-field-row" key={f.key || i}>
              <input className="fm-field-label" value={f.label ?? ''} onChange={e => setField(i, 'label', e.target.value)} placeholder="Label" maxLength={60} aria-label={`Field ${i + 1} label`} />
              <input className="fm-field-placeholder" value={f.placeholder ?? ''} onChange={e => setField(i, 'placeholder', e.target.value)} placeholder="Placeholder" maxLength={60} aria-label={`Field ${i + 1} placeholder`} />
              <select value={f.type} disabled={f.locked} onChange={e => setField(i, 'type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <label className="row" style={{ fontSize: 11.5, gap: 5, margin: 0 }}>
                <input type="checkbox" checked={!!f.required} disabled={f.locked}
                  onChange={e => setField(i, 'required', e.target.checked)} /> required</label>
              <button className="icon-btn sm" title={f.locked ? 'Email field cannot be removed' : 'Remove field'}
                disabled={f.locked} onClick={() => setDraft(d => ({ ...d, fields: d.fields.filter((_, j) => j !== i) }))}>
                <Icon name="close" size={12} /></button>
              {f.type === 'select' && <label className="fm-options">Dropdown choices <span className="muted">(one per line)</span>
                <textarea value={(f.options || []).join('\n')} onChange={e => setField(i, 'options', e.target.value.split('\n'))} rows={3} aria-label={`Field ${i + 1} dropdown choices`} /></label>}
            </div>)}
            <p className="muted" style={{fontSize:11, margin:'4px 0 8px'}}>Placeholders appear in text fields and dropdowns; browsers do not display them for checkboxes or date fields.</p>
            <button className="btn ghost sm" onClick={() => setDraft(d => ({ ...d, fields: [...d.fields, blankField()] }))}>
              <Icon name="plus" size={12} /> Add field</button>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <div><label>Save contacts to list</label>
                <select style={{ width: '100%' }} value={draft.listId} onChange={e => set('listId', e.target.value)}>
                  <option value="">No list</option>
                  {options.lists.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
                <button type="button" className="btn ghost sm" style={{marginTop:6}} onClick={() => { setShowNewList(v => !v); setListError(''); }} aria-expanded={showNewList}>+ Create new list</button>
                {showNewList && <div className="fm-new-list">
                  <label htmlFor="fm-list-name">New list name</label>
                  <input id="fm-list-name" value={listName} onChange={e => setListName(e.target.value)} maxLength={80} placeholder="e.g. Newsletter" disabled={listBusy} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); createList(); } }} />
                  <button type="button" className="btn secondary sm" disabled={listBusy} onClick={createList}>{listBusy ? 'Creating…' : 'Create and select'}</button>
                  {listError && <p role="alert" className="fm-list-error">{listError}</p>}
                </div>}
              </div>
              <div><label>Start automation</label>
                <select style={{ width: '100%' }} value={draft.automationId} onChange={e => set('automationId', e.target.value)}>
                  <option value="">None</option>
                  {options.automations.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select></div>
            </div>
            <label style={{ marginTop: 10 }}>Tags added to new contacts <span className="muted">(comma separated)</span></label>
            <input style={{ width: '100%' }} value={draft.tags} onChange={e => set('tags', e.target.value)} placeholder="newsletter, website" />

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div><label>Success message</label>
                <input style={{ width: '100%' }} value={draft.successMessage} onChange={e => set('successMessage', e.target.value)} /></div>
              <div><label>Or redirect to <span className="muted">(optional URL)</span></label>
                <input style={{ width: '100%' }} value={draft.redirectUrl} onChange={e => set('redirectUrl', e.target.value)} placeholder="https://your.site/thanks" /></div>
            </div>

            <div className="mini-row" style={{ marginTop: 14 }}>
              <label style={{ margin: 0 }}>Accent colour</label>
              <div className="row">
                <input type="color" value={accent} onChange={e => set('appearance', { ...draft.appearance, accent: e.target.value })}
                  style={{ width: 42, height: 32, padding: 2, border: '1px solid var(--line)', borderRadius: 8, background: '#fff' }} />
                <select value={draft.appearance?.layout || 'card'}
                  onChange={e => set('appearance', { ...draft.appearance, layout: e.target.value })}>
                  <option value="card">Card style</option>
                  <option value="inline">Inline style</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn sm" onClick={save} disabled={busy === 'save'}>
                {busy === 'save' ? 'Saving…' : activeId ? 'Save changes' : 'Create form'}</button>
              {activeId && <button className="btn ghost sm" onClick={() => remove(active)}>Delete</button>}
              {activeId && draft.redirectUrl === undefined && null}
            </div>
          </div>

          <div className="fm-preview">
            <div className="fm-preview-frame">
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: '#7d90a9', marginBottom: 8 }}>LIVE PREVIEW</div>
              <div className="hf-card" style={{ '--hf-accent': accent, maxWidth: '100%', padding: 20, gap: 10 }}>
                <h1 style={{ fontSize: 18 }}>{draft.headline || draft.name || 'Your headline'}</h1>
                {draft.description ? <p className="hf-sub" style={{ fontSize: 12.5 }}>{draft.description}</p> : null}
                {previewFields.map(f => <label className="hf-field" key={f.key} style={{ fontSize: 11.5 }}>
                  <span>{f.label}{f.required ? <em>*</em> : null}</span>
                  {f.type === 'textarea' ? <textarea rows={3} placeholder={f.placeholder} readOnly />
                    : f.type === 'select' ? <select readOnly><option>{f.placeholder || 'Choose…'}</option></select>
                      : f.type === 'checkbox' ? <input type="checkbox" readOnly /> : <input type={['email','number','date','tel'].includes(f.type) ? f.type : 'text'} placeholder={f.placeholder} readOnly />}
                </label>)}
                <button className="hf-submit" type="button" disabled style={{ cursor: 'default' }}>{draft.submitLabel || 'Subscribe'}</button>
                <p className="hf-fine">No spam. Unsubscribe any time.</p>
              </div>
            </div>
            {active && <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Public page: <a href={`/f/${active.slug}`} target="_blank" rel="noopener">/f/{active.slug}</a> ·
              {' '}{active.views || 0} view{active.views === 1 ? '' : 's'}
            </p>}
          </div>
        </div>}

        {tab === 'subs' && <div className="card luxe-card" style={{ padding: 16 }}>
          {!activeId ? <Empty text="Save a form first, then its submissions appear here in real time." />
            : <>
              <div className="fm-stat-row">
                <div className="fm-stat"><b>{subs.total}</b><span>Submissions</span></div>
                <div className="fm-stat"><b>{active?.views || 0}</b><span>Page views</span></div>
                <div className="fm-stat"><b>{subs.total && active?.views ? Math.round((subs.total / active.views) * 100) : 0}%</b><span>Conversion</span></div>
              </div>
              <div className="mini-row" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Latest submissions</h3>
                <div className="row">
                  <button className="btn ghost sm" onClick={() => loadSubs(activeId)}>Refresh</button>
                  <button className="btn secondary sm" onClick={exportCsv}>Export CSV</button>
                </div>
              </div>
              {subs.items.length === 0
                ? <Empty text="No submissions yet. Open the public page and submit it once to see the whole path working." />
                : <div style={{ overflowX: 'auto' }}><table className="fm-subs">
                  <thead><tr><th>When</th><th>Email</th>{previewFields.filter(f => f.key !== 'email').map(f => <th key={f.key}>{f.label}</th>)}<th>Contact</th></tr></thead>
                  <tbody>{subs.items.map(s => <tr key={s._id}>
                    <td className="muted">{new Date(s.createdAt).toLocaleString()}</td>
                    <td><b>{s.email}</b></td>
                    {previewFields.filter(f => f.key !== 'email').map(f => <td key={f.key}>{s.data?.[f.key] || '—'}</td>)}
                    <td>{s.contactId ? <Link href="/dashboard/contacts" className="muted">in contacts</Link> : '—'}</td>
                  </tr>)}</tbody>
                </table></div>}
              <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                Duplicate emails update the existing contact instead of creating a second one, so this table stays clean.
              </p>
            </>}
        </div>}

        {tab === 'embed' && <div className="card luxe-card" style={{ padding: 16 }}>
          {!activeId ? <Empty text="Save a form first to get its link and embed code." />
            : !embed ? <p className="muted" style={{ fontSize: 12.5 }}>Building your embed code…</p>
              : <>
                <h3 style={{ marginTop: 0 }}>Put “{active?.name}” on your website</h3>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  Three ways, all pointing at this workspace. Submissions arrive here the moment someone presses the button.
                </p>

                <label style={{ marginTop: 12 }}>1 · Share the hosted page</label>
                <div className="row">
                  <input readOnly value={embed.publicUrl} style={{ flex: 1, minWidth: 0 }} onFocus={e => e.target.select()} />
                  <button className="btn ghost sm" onClick={() => copy(embed.publicUrl, 'Link')}>Copy</button>
                  <a className="btn secondary sm" href={embed.publicUrl} target="_blank" rel="noopener">Open</a>
                </div>

                <label style={{ marginTop: 14 }}>2 · Paste an iframe anywhere</label>
                <div className="fm-embed">{embed.iframeSnippet}</div>
                <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => copy(embed.iframeSnippet, 'Iframe code')}>Copy iframe</button>

                <label style={{ marginTop: 14 }}>3 · Plain HTML form (your own styling)</label>
                <div className="fm-embed">{embed.htmlSnippet}</div>
                <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => copy(embed.htmlSnippet, 'HTML snippet')}>Copy HTML</button>

                <p className="muted" style={{ fontSize: 11.5, marginTop: 14 }}>
                  The endpoint accepts cross-origin posts: <code>{embed.endpoint}</code>
                  {' '}— 20 submissions per hour per IP, honeypot protected.
                </p>
              </>}
        </div>}
      </div>
    </div>
  </>;
}

function StarterGallery({ forms, loading, onUse, onBlank }) {
  return <section className="fm-starter-library" aria-labelledby="fm-starter-title">
    <div className="fm-starter-header">
      <div><span className="fm-eyebrow">READY-MADE STARTING POINTS</span>
        <h2 id="fm-starter-title">Choose a form, then make it yours</h2>
        <p>Five useful layouts for common goals. Each starts paused, without a list or automation, so you can review everything before sharing.</p>
      </div>
      <button className="btn secondary sm" onClick={onBlank}><Icon name="plus" size={14} /> Build from scratch</button>
    </div>
    {loading ? <CardGridSkeleton count={4} columns={2} />
      : forms.length ? <div className="fm-starter-grid">
        {forms.map(form => <article className="fm-starter-card" key={form._id}
          style={{ '--fm-card-accent': form.appearance?.accent || '#3158c9' }}>
          <div className="fm-starter-card-top">
            <span className="fm-starter-icon"><Icon name={categoryIcon(form.starterCategory)} size={17} /></span>
            <span className="badge warn">Paused by default</span>
          </div>
          <span className="fm-starter-category">{form.starterCategory || 'Starter form'}</span>
          <h3>{form.name}</h3>
          <p>{form.description}</p>
          <div className="fm-starter-details"><span>{form.fields?.length || 1} fields</span><span>Hosted page + embed code</span></div>
          <button className="fm-starter-use" onClick={() => onUse(form)}>Customize this form <Icon name="chevron" size={15} /></button>
        </article>)}
      </div> : <div className="fm-no-starters"><Icon name="inbox" size={22} /><b>No starter forms available yet</b>
        <span>You can still build a blank form; refresh later to load the starter library.</span>
        <button className="btn secondary sm" onClick={onBlank}>Create a blank form</button>
      </div>}
    <div className="fm-starter-footnote"><Icon name="shield" size={14} /> No form is published or connected to an audience until you review it and choose to turn it on.</div>
  </section>;
}

const Empty = ({ text }) => <div className="empty" style={{ padding: '26px 18px', textAlign: 'center' }}>
  <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{text}</p>
</div>;

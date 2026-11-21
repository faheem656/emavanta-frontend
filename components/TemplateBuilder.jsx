'use client';
import { useEffect, useMemo, useState } from 'react';
import { post, patch } from '../lib/api';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import { notify } from '../lib/notify';
import { blocksToHtml, DEFAULT_EMAIL_STYLES } from '../lib/shared/email-engine/template.js';

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const PALETTE = [
  ['heading', 'Heading', 'mail'],
  ['text', 'Text', 'code'],
  ['button', 'Button', 'bolt'],
  ['link', 'Link', 'chevron'],
  ['image', 'Image', 'eye'],
  ['card', 'Card / box', 'card'],
  ['columns', '2 columns', 'contacts'],
  ['divider', 'Divider', 'close'],
  ['spacer', 'Spacer', 'clock'],
  ['unsubscribe', 'Unsubscribe', 'shield'],
  ['address', 'Address', 'home'],
  ['raw_html', 'Custom HTML', 'code']
];

const DEFAULTS = {
  heading: { content: 'Your headline', size: 24, weight: 700, color: '#172b4d', align: 'left' },
  text: { content: 'Write your message. Tokens like {{first_name|there}} work here.', size: 15, color: '#334a67', lineHeight: 1.6 },
  button: { content: 'Book a call', href: 'https://example.com', background: '#1f4e94', color: '#ffffff', radius: 8, padding: 12, weight: 600, align: 'left' },
  link: { content: 'Read the full story', href: 'https://example.com', color: '#1f4e94', underline: true, size: 15 },
  image: { href: '', alt: 'Product screenshot', width: 100, radius: 10, align: 'center' },
  card: { content: 'A highlighted note for {{company|your team}}.', background: '#f5f8fd', borderColor: '#e3eaf4', borderWidth: 1, radius: 12, padding: 18, color: '#334a67' },
  columns: { content: 'Left column|||Right column', gap: 16, size: 15 },
  divider: { borderColor: '#e3eaf4', borderWidth: 1, padding: 18 },
  spacer: { height: 24 },
  unsubscribe: { content: 'Unsubscribe', color: '#7b8ca5', size: 12, align: 'center' },
  address: { content: 'Your business address', color: '#7b8ca5', size: 12, align: 'center' },
  raw_html: { content: '<div>Custom HTML</div>' }
};

const BRAND = [
  ['#1f4e94', 'Navy'], ['#0f9d6e', 'Green'], ['#6d5ce7', 'Violet'],
  ['#b58a3a', 'Gold'], ['#12233a', 'Ink'], ['#c2413a', 'Red'],
  ['#ffffff', 'White'], ['#f5f8fd', 'Mist']
];
const FONTS = [['Arial,Helvetica,sans-serif', 'Arial'], ['Georgia,serif', 'Georgia'],
  ['"Segoe UI",Roboto,sans-serif', 'Segoe UI'], ['"Courier New",monospace', 'Mono']];
const TOKENS = ['{{first_name|there}}', '{{company|your team}}', '{{sender_name}}', '{{city}}', '{{unsubscribe_url}}'];

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sample = { first_name: 'Dana', last_name: 'Nguyen', company: 'Northwind', email: 'dana@northwind.com', sender_name: 'You', city: 'Vilnius', unsubscribe_url: '#' };
const fill = (text, values = sample) => String(text || '').replace(/\{\{\s*([\w.]+)(?:\|([^}]*))?\s*\}\}/g,
  (_, k, fb) => values[k] ?? (fb !== undefined ? fb : ''));

const STARTER_BLOCKS = () => [
  { type: 'heading', ...DEFAULTS.heading, content: 'Hi {{first_name|there}},' },
  { type: 'text', ...DEFAULTS.text, content: 'A quick note for {{company|your team}}.' },
  { type: 'button', ...DEFAULTS.button },
  { type: 'address', ...DEFAULTS.address },
  { type: 'unsubscribe', ...DEFAULTS.unsubscribe }
];

const STARTER_HTML = `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;color:#16263d;margin:0;padding:24px">
    <h1 style="margin:0 0 12px">Hi {{first_name|there}}</h1>
    <p style="color:#334a67;line-height:1.6">A quick note for {{company|your team}}.</p>
    <p><a href="https://example.com" style="background:#1f4e94;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">See the details</a></p>
    <p style="font-size:12px;color:#7b8ca5">Your business address · <a href="{{unsubscribe_url}}">Unsubscribe</a></p>
  </body>
</html>`;

/* ------------------------------------------------------------------ */
/* Small controls                                                      */
/* ------------------------------------------------------------------ */

const ColorField = ({ label, value, onChange }) => <div className="field">
  <label>{label}</label>
  <div className="color-field">
    <input type="color" value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000'}
      onChange={e => onChange(e.target.value)} aria-label={`${label} picker`} />
    <input className="hex" value={value || ''} placeholder="#1f4e94" onChange={e => onChange(e.target.value)} />
    {value && <button className="icon-btn sm" title="Clear" onClick={() => onChange('')}><Icon name="close" size={11} /></button>}
  </div>
</div>;

const Swatches = ({ onPick }) => <div className="swatch-row">
  {BRAND.map(([c, name]) => <button key={c} className="swatch" title={name} style={{ background: c }} onClick={() => onPick(c)} />)}
</div>;

const RangeField = ({ label, value, min, max, step = 1, suffix = '', onChange }) => <div className="field">
  <label>{label} <span className="muted">{value}{suffix}</span></label>
  <input type="range" min={min} max={max} step={step} value={value ?? min} onChange={e => onChange(Number(e.target.value))} />
</div>;

const Segmented = ({ value, options, onChange }) => <div className="segmented sm">
  {options.map(([v, label]) => <button key={v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>{label}</button>)}
</div>;

/* ------------------------------------------------------------------ */

export default function TemplateBuilder({ initial, onSaved, onBack, onStarted }) {
  const toast = useToast();
  const [tpl, setTpl] = useState(initial || null);
  const [mode, setMode] = useState(initial?.mode || '');
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState('content');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [device, setDevice] = useState('desktop');
  const [showPreview, setShowPreview] = useState(true);
  const [pageOpen, setPageOpen] = useState(false);

  useEffect(() => {
    setTpl(initial || null); setMode(initial?.mode || ''); setSelected(0); setResult(null); setTab('content');
  }, [initial?._id]);

  const start = choice => {
    setTpl(choice === 'blocks'
      ? { name: 'New template', subject: 'Hi {{first_name|there}}', mode: 'blocks', blocks: STARTER_BLOCKS(), styles: { ...DEFAULT_EMAIL_STYLES } }
      : { name: 'New template', subject: 'Hi {{first_name|there}}', mode: 'code', blocks: [], html: STARTER_HTML, styles: { ...DEFAULT_EMAIL_STYLES } });
    setMode(choice);
    onStarted?.();
  };

  const blocks = tpl?.blocks || [];
  const styles = tpl?.styles || {};
  const setStyles = next => setTpl({ ...tpl, styles: { ...styles, ...next } });
  const setBlocks = next => setTpl({ ...tpl, blocks: next });
  const active = blocks[selected];

  const addBlock = type => {
    const block = { type, ...(DEFAULTS[type] || {}) };
    const next = [...blocks];
    next.splice(selected + 1 || next.length, 0, block);
    setBlocks(next);
    setSelected(selected + 1 > next.length - 1 ? next.length - 1 : selected + 1);
    setTab('content');
  };
  const update = patchObj => setBlocks(blocks.map((b, i) => (i === selected ? { ...b, ...patchObj } : b)));
  const remove = i => { setBlocks(blocks.filter((_, j) => j !== i)); setSelected(Math.max(0, i - 1)); };
  const move = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= blocks.length) return;
    const next = [...blocks]; [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next); setSelected(j);
  };
  const duplicate = i => {
    const next = [...blocks]; next.splice(i + 1, 0, { ...blocks[i] });
    setBlocks(next); setSelected(i + 1);
  };

  /* The canvas and the real email come from the same renderer. */
  const preview = useMemo(() => {
    if (!tpl) return '';
    const html = (mode || 'blocks') === 'code'
      ? (tpl.html || '')
      : blocksToHtml(tpl.blocks || [], tpl.styles || {});
    return fill(html);
  }, [tpl, mode]);

  const changeMode = next => {
    if (next === mode) return;
    if (next === 'code') {
      if (!window.confirm('Convert the current visual design to HTML? Returning to visual keeps it as one HTML block.')) return;
      setTpl({ ...tpl, mode: 'code', html: blocksToHtml(tpl.blocks || [], tpl.styles || {}) });
    } else {
      if (!window.confirm('Keep this HTML as a single custom HTML block? Individual elements will not be editable as visual blocks.')) return;
      setTpl({ ...tpl, mode: 'blocks', blocks: [{ type: 'raw_html', content: tpl.html || '' }] });
      setSelected(0);
    }
    setMode(next);
  };

  const save = async () => {
    if (!tpl) return;
    setBusy('save');
    try {
      const payload = {
        name: tpl.name?.trim().length >= 2 ? tpl.name : 'Untitled template',
        subject: tpl.subject?.trim() || 'Hello from {{sender_name}}',
        mode: tpl.mode || 'blocks',
        blocks: (tpl.blocks?.length ? tpl.blocks : [{ type: 'raw_html', content: tpl.html || '<div></div>' }]),
        styles: tpl.styles || {},
        html: tpl.html
      };
      const saved = tpl._id ? await patch(`/templates/${tpl._id}`, payload) : await post('/templates', payload);
      setTpl({ ...tpl, ...saved });
      setMode(saved.mode || payload.mode);
      const check = await post(`/templates/${saved._id}/preflight`, { tokens: { first_name: 'Dana' } }).catch(() => null);
      setResult({ check });
      toast(check?.ok ? 'Saved — preflight passed' : check ? 'Saved — check the preflight notes' : 'Saved — preflight unavailable');
      onSaved?.(saved);
    } catch (e) { notify(toast, e); } finally { setBusy(''); }
  };

  if (!tpl) return <div className="tpl-chooser">
    <button className="tpl-choice" onClick={() => start('blocks')}>
      <div className="tpl-choice-icon"><Icon name="contacts" size={22} /></div>
      <h3>Visual editor</h3>
      <p className="muted">Build with blocks, typography, colours and spacing. Preview your email as you work.</p>
      <span className="badge ok">Recommended</span>
    </button>
    <button className="tpl-choice" onClick={() => start('code')}>
      <div className="tpl-choice-icon alt"><Icon name="code" size={22} /></div>
      <h3>Custom HTML</h3>
      <p className="muted">A full-size code workspace for hand-built emails. Move it into the visual editor as a custom HTML block.</p>
      <span className="badge">For developers</span>
    </button>
    <p className="muted" style={{ gridColumn: '1/-1', fontSize: 12.5 }}>
      Both modes share the same renderer and preflight, so tracking, unsubscribe and personalization tokens behave identically.
    </p>
  </div>;

  return <div className="tpl-editor">
    <div className="tpl-header">
      {onBack && <button className="icon-btn" title="Back to library" onClick={onBack}><Icon name="chevron" size={15}/></button>}
      <input className="tpl-name" value={tpl.name || ''} onChange={e => setTpl({ ...tpl, name: e.target.value })} placeholder="Template name" />
      <input className="tpl-subject" value={tpl.subject || ''} onChange={e => setTpl({ ...tpl, subject: e.target.value })} placeholder="Subject line with {{tokens}}" />
      <div className="segmented">
        <button className={(mode || 'blocks') === 'blocks' ? 'active' : ''} onClick={() => { changeMode('blocks'); }}>Visual</button>
        <button className={mode === 'code' ? 'active' : ''} onClick={() => { changeMode('code'); }}>Code</button>
      </div>
      <button className="btn secondary sm" onClick={() => setShowPreview(v => !v)}><Icon name="eye" size={14} /> {showPreview ? 'Hide' : 'Show'} preview</button>
      <button className="btn sm" onClick={save} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save & preflight'}</button>
    </div>

    <div className={`tpl-body ${showPreview ? 'with-preview' : ''} ${(mode || 'blocks') === 'code' ? 'code-mode' : ''}`}>
      {(mode || 'blocks') === 'blocks' && <aside className="tpl-palette">
        <div className="stat-label">Add a block</div>
        <div className="palette-grid">
          {PALETTE.map(([type, label, icon]) => <button key={type} className="palette-btn" onClick={() => addBlock(type)}>
            <Icon name={icon} size={14} /> <span>{label}</span><span className="palette-plus">+</span></button>)}
        </div>
        <div className="divider" />
        <div className="stat-label">Page style</div>
        <button className="palette-btn" onClick={() => setPageOpen(v => !v)}><Icon name="settings" size={14} /> <span>Background & width</span></button>
        {pageOpen && <div style={{ marginTop: 10 }}>
          <ColorField label="Email background" value={styles.background} onChange={v => setStyles({ background: v })} />
          <Swatches onPick={c => setStyles({ background: c })} />
          <RangeField label="Content width" value={styles.width ?? 640} min={480} max={760} step={10} suffix="px" onChange={v => setStyles({ width: v })} />
          <RangeField label="Inner padding" value={styles.padding ?? 24} min={8} max={48} suffix="px" onChange={v => setStyles({ padding: v })} />
          <div className="field"><label>Font family</label>
            <select value={styles.fontFamily || FONTS[0][0]} onChange={e => setStyles({ fontFamily: e.target.value })}>
              {FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
        </div>}
        <div className="divider" />
        <div className="stat-label">Insert token</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {TOKENS.slice(0, 3).map(t => <button key={t} className="chip tiny" title={`Add to subject`}
            onClick={() => setTpl({ ...tpl, subject: `${tpl.subject || ''}${t}` })}>{t.replace(/[{}]/g, '')}</button>)}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Click a token to append it to the subject line.</p>
      </aside>}

      <div className="tpl-canvas">
        {(mode || 'blocks') === 'blocks' ? <>
          <div className="canvas-bar">
            <span className="canvas-label">Canvas · select a block to edit its settings</span>
            <span className="muted" style={{ fontSize: 11.5 }}>{blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
          </div>
          <div className="canvas-paper" style={{ maxWidth: styles.width || 640, background: styles.background || '#fff' }}>
            <div className="paper-subject" style={{ color: styles.subjectColor || '#12233a' }}>{fill(esc(tpl.subject)) || 'Your subject line'}</div>
            {blocks.map((b, i) => <div key={i} className={`canvas-block ${selected === i ? 'active' : ''}`} onClick={() => { setSelected(i); setTab('content'); }}>
              {selected === i && <div className="block-tools" onClick={e => e.stopPropagation()}>
                <button onClick={() => move(i, -1)} title="Move up">↑</button>
                <button onClick={() => move(i, 1)} title="Move down">↓</button>
                <button onClick={() => duplicate(i)} title="Duplicate"><Icon name="copy" size={11} /></button>
                <button onClick={() => remove(i)} title="Remove"><Icon name="close" size={11} /></button>
              </div>}
              {b.type === 'heading' && <h2
                style={{ textAlign: b.align, color: b.color, fontSize: b.size, fontWeight: b.weight, lineHeight: b.lineHeight, letterSpacing: b.letterSpacing, background: b.background }}>{fill(esc(b.content))}</h2>}
              {b.type === 'text' && <p
                style={{ textAlign: b.align, color: b.color, fontSize: b.size, fontWeight: b.weight, lineHeight: b.lineHeight, background: b.background, padding: b.padding, borderRadius: b.radius }}>{fill(esc(b.content))}</p>}
              {b.type === 'link' && <p style={{ textAlign: b.align }}>
                <span className="canvas-link" style={{ color: b.color, textDecoration: b.underline === false ? 'none' : 'underline', fontSize: b.size }}>{fill(esc(b.content))}</span>
                {b.href && <span className="muted" style={{ fontSize: 10.5, marginLeft: 6 }}>→ {b.href}</span>}</p>}
              {b.type === 'button' && <p style={{ textAlign: b.align }} className="canvas-btn-wrap">
                <span className="canvas-btn" style={{ background: b.background, color: b.color, borderRadius: b.radius, padding: `${b.padding ?? 12}px ${(b.padding ?? 12) + 8}px`, fontWeight: b.weight, fontSize: b.size }}>
                  <span>{fill(esc(b.content))}</span>
                </span>{b.href && <span className="muted" style={{ fontSize: 10.5, marginLeft: 8 }}>→ {b.href}</span>}
              </p>}
              {b.type === 'card' && <div className="canvas-card"
                style={{ background: b.background, border: `${b.borderWidth ?? 1}px solid ${b.borderColor}`, borderRadius: b.radius, padding: b.padding, color: b.color, textAlign: b.align }}>{fill(esc(b.content))}</div>}
              {b.type === 'image' && <div className="canvas-img" style={{ textAlign: b.align || 'center' }}>
                {b.href ? <img src={b.href} alt={b.alt || ''} style={{ width: `${b.width ?? 100}%`, borderRadius: b.radius }} /> : 'Set an image URL on the right →'}</div>}
              {b.type === 'columns' && <div className="canvas-cols" style={{ gap: b.gap }}>
                {String(b.content || '').split('|||').map((c, ci) => <div key={ci}>{fill(esc(c))}</div>)}
              </div>}
              {b.type === 'divider' && <hr style={{ borderTop: `${b.borderWidth ?? 1}px solid ${b.borderColor || '#e3eaf4'}`, margin: `${b.padding ?? 18}px 0` }} />}
              {b.type === 'spacer' && <div style={{ height: Number(b.height || 16) }} className="canvas-spacer" />}
              {b.type === 'unsubscribe' && <p style={{ fontSize: b.size || 12, color: b.color, textAlign: b.align }}>
                <span className="canvas-link" style={{ color: b.color }}>{fill(esc(b.content || 'Unsubscribe'))}</span>
                <span className="muted" style={{ fontSize: 10.5, marginLeft: 6 }}>(link added automatically)</span></p>}
              {b.type === 'address' && <p className="muted" style={{ fontSize: b.size || 12, color: b.color, textAlign: b.align }}>{fill(esc(b.content))}</p>}
              {b.type === 'raw_html' && <pre className="canvas-raw">{b.content || '<div>Custom HTML</div>'}</pre>}
            </div>)}
            {!blocks.length && <div className="empty">Add your first block from the left palette.</div>}
          </div>
        </> : <>
          <div className="canvas-bar">
            <span className="canvas-label">Custom HTML · full-size editor</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost sm" onClick={() => setTpl({ ...tpl, html: `${tpl.html || ''}\n` })}>New line</button>
              <button className="btn ghost sm" onClick={() => changeMode('blocks')}><Icon name="contacts" size={14} /> Convert to visual</button>
            </div>
          </div>
          <div className="code-toolbar">
            {TOKENS.map(t => <button key={t} className="chip tiny" onClick={() => setTpl({ ...tpl, html: `${tpl.html || ''}${t}` })}>{t}</button>)}
          </div>
          <textarea className="editor code-editor" spellCheck={false} wrap="off" value={tpl.html || ''}
            onChange={e => setTpl({ ...tpl, html: e.target.value })} placeholder="<!doctype html> …" />
          <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: 11.5 }}>{(tpl.html || '').length} characters · email clients may render CSS differently</span>
            <span className="muted" style={{ fontSize: 11.5 }}>Scripts, iframes and inline handlers are stripped on save.</span>
          </div>
        </>}
      </div>

      {showPreview && <aside className="tpl-preview">
        <div className="mini-row"><div className="stat-label">Live preview</div>
          <div className="segmented sm">
            <button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>Desktop</button>
            <button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
          </div>
        </div>
        <div className={`preview-frame ${device}`}><iframe title="preview" srcDoc={preview} sandbox="" /></div>
        <p className="muted" style={{ fontSize: 11 }}>Rendered by the same engine that sends your mail · tokens shown with sample data.</p>
      </aside>}
    </div>

    {(mode || 'blocks') === 'blocks' && active && <div className="tpl-settings">
      <div className="mini-row">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{active.type}</span>
          <div className="segmented sm">
            <button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}>Content</button>
            <button className={tab === 'style' ? 'active' : ''} onClick={() => setTab('style')}>Style</button>
            <button className={tab === 'advanced' ? 'active' : ''} onClick={() => setTab('advanced')}>Advanced</button>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn sm" title="Duplicate" onClick={() => duplicate(selected)}><Icon name="copy" size={12} /></button>
          <button className="icon-btn sm" title="Delete" onClick={() => remove(selected)}><Icon name="close" size={12} /></button>
        </div>
      </div>

      <div className="settings-body">
        {tab === 'content' && <>
          {['heading', 'text', 'card', 'raw_html', 'address', 'unsubscribe'].includes(active.type) && <div className="field">
            <label>{active.type === 'raw_html' ? 'HTML' : 'Text'}</label>
            <textarea rows={active.type === 'raw_html' ? 5 : 4} value={active.content || ''} onChange={e => update({ content: e.target.value })} />
            <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {TOKENS.map(t => <button key={t} className="chip tiny" onClick={() => update({ content: `${active.content || ''}${t}` })}>{t}</button>)}
            </div>
          </div>}
          {['button', 'link'].includes(active.type) && <>
            <div className="field"><label>Label</label>
              <input value={active.content || ''} onChange={e => update({ content: e.target.value })} /></div>
            <div className="field"><label>Link (https://…) </label>
              <input value={active.href || ''} onChange={e => update({ href: e.target.value })} placeholder="https://yourdomain.com/offer" />
              {active.href && <span className="muted" style={{ fontSize: 11 }}>Links are click-tracked automatically on send.</span>}</div>
          </>}
          {active.type === 'image' && <>
            <div className="field"><label>Image URL</label>
              <input value={active.href || ''} onChange={e => update({ href: e.target.value })} placeholder="https://cdn.example.com/hero.png" /></div>
            <div className="field"><label>Alt text</label>
              <input value={active.alt || ''} onChange={e => update({ alt: e.target.value })} placeholder="Describe the image" /></div>
            <div className="field"><label>Link (optional)</label>
              <input value={active.link || ''} onChange={e => update({ link: e.target.value })} placeholder="https://…" /></div>
          </>}
          {active.type === 'columns' && <div className="field"><label>Columns (separate with |||)</label>
            <textarea rows={3} value={active.content || ''} onChange={e => update({ content: e.target.value })} /></div>}
          {active.type === 'spacer' && <RangeField label="Height" value={active.height || 24} min={4} max={160} suffix="px" onChange={v => update({ height: v })} />}
          {active.type === 'divider' && <RangeField label="Gap above/below" value={active.padding ?? 18} min={0} max={64} suffix="px" onChange={v => update({ padding: v })} />}
          {active.type === 'unsubscribe' && <div className="notice" style={{ fontSize: 12 }}>
            Every send includes this automatically — you only choose the wording and colour.</div>}
        </>}

        {tab === 'style' && <>
          {['link', 'unsubscribe'].includes(active.type)
            ? <ColorField label="Link colour" value={active.color} onChange={v => update({ color: v })} />
            : <ColorField label="Text colour" value={active.color} onChange={v => update({ color: v })} />}
          <Swatches onPick={c => update({ color: c })} />
          {active.type === 'button' && <>
            <ColorField label="Button background" value={active.background} onChange={v => update({ background: v })} />
            <Swatches onPick={c => update({ background: c })} />
          </>}
          {['card', 'heading', 'text'].includes(active.type) && <>
            <ColorField label="Background" value={active.background} onChange={v => update({ background: v })} />
            <Swatches onPick={c => update({ background: c })} />
          </>}
          <div className="settings-grid">
            <div className="field"><label>Align</label>
              <Segmented value={active.align || 'left'} onChange={v => update({ align: v })}
                options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} /></div>
            <div className="field"><label>Size</label>
              <div className="row" style={{ gap: 6 }}>
                <input type="number" min={8} max={72} value={active.size ?? ''} placeholder="15" style={{ width: 74 }}
                  onChange={e => update({ size: e.target.value === '' ? undefined : Number(e.target.value) })} />
                <span className="muted" style={{ fontSize: 12 }}>px</span>
              </div></div>
            <div className="field"><label>Weight</label>
              <select value={active.weight || 400} onChange={e => update({ weight: Number(e.target.value) })}>
                {[300, 400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
              </select></div>
            <div className="field"><label>Line height</label>
              <input type="number" step="0.1" min="1" max="2.4" value={active.lineHeight ?? ''} placeholder="1.6"
                onChange={e => update({ lineHeight: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
            {['button', 'card', 'image', 'text'].includes(active.type) && <div className="field"><label>Corner radius</label>
              <input type="number" min={0} max={40} value={active.radius ?? ''} placeholder="8"
                onChange={e => update({ radius: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>}
            {['button', 'card', 'heading', 'text', 'divider'].includes(active.type) && <RangeField label="Padding" value={active.padding ?? 0} min={0} max={48} suffix="px"
              onChange={v => update({ padding: v })} />}
          </div>
        </>}

        {tab === 'advanced' && <div className="settings-grid">
          <div className="field"><label>Font family</label>
            <select value={active.fontFamily || styles.fontFamily || FONTS[0][0]} onChange={e => update({ fontFamily: e.target.value })}>
              {FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div className="field"><label>Letter spacing</label>
            <input type="number" step="0.1" value={active.letterSpacing ?? ''} placeholder="0"
              onChange={e => update({ letterSpacing: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
          {active.type === 'divider' && <>
            <ColorField label="Line colour" value={active.borderColor} onChange={v => update({ borderColor: v })} />
            <RangeField label="Thickness" value={active.borderWidth ?? 1} min={1} max={8} suffix="px" onChange={v => update({ borderWidth: v })} />
          </>}
          {['card'].includes(active.type) && <>
            <ColorField label="Border colour" value={active.borderColor} onChange={v => update({ borderColor: v })} />
            <RangeField label="Border width" value={active.borderWidth ?? 1} min={0} max={6} suffix="px" onChange={v => update({ borderWidth: v })} />
          </>}
          {active.type === 'image' && <RangeField label="Width" value={active.width ?? 100} min={10} max={100} suffix="%" onChange={v => update({ width: v })} />}
          {active.type === 'columns' && <RangeField label="Gap between columns" value={active.gap ?? 16} min={0} max={48} suffix="px" onChange={v => update({ gap: v })} />}
          {active.type === 'link' && <div className="field"><label>Underline</label>
            <Segmented value={active.underline === false ? 'no' : 'yes'} onChange={v => update({ underline: v === 'yes' })}
              options={[['yes', 'Underline'], ['no', 'Plain']]} /></div>}
        </div>}
      </div>
    </div>}

    {result && <div className="card" style={{ marginTop: 14 }}>
      <div className="mini-row"><b>Preflight</b>
        <span className={`badge ${result.check?.ok ? 'ok' : 'warn'}`}>{result.check?.ok ? 'passed' : 'review'}</span></div>
      {result.check && <p className="muted">{result.check.bytes} bytes · {(result.check.tokens || []).length} tokens</p>}
      {(result.check?.issues || []).map((x, i) => <p key={i} className={x.level === 'error' ? 'error' : 'muted'} style={{ fontSize: 12 }}>
        {x.level}: {x.code} {x.token || x.word || ''}</p>)}
    </div>}
  </div>;
}

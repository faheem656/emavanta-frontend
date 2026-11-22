'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The home-page console: a small, honest simulation of the real dashboard.
 *
 * It is interactive on purpose — tab switching, a live send feed and a cadence slider that
 * recomputes throughput — so the first screen shows behaviour instead of a screenshot.
 * Nothing here talks to the API; it exists to make the product legible.
 */

const TABS = [
  { id: 'cadence', label: 'Cadence', icon: '◷' },
  { id: 'templates', label: 'Templates', icon: '▦' },
  { id: 'automation', label: 'Automation', icon: '⟳' },
  { id: 'forms', label: 'Hosted form', icon: '◫' }
];

const FEED_POOL = [
  ['ada@northwind.example', 'sent', '62s gap'],
  ['leo@brightlabs.example', 'sent', '71s gap'],
  ['maya@fieldnote.example', 'opened', '58s gap'],
  ['tom@arcstudio.example', 'sent', '83s gap'],
  ['riya@fernco.example', 'replied', 'paused flow'],
  ['sana@lumen.example', 'sent', '66s gap'],
  ['noah@pineworks.example', 'bounced', 'suppressed'],
  ['ivy@draftly.example', 'clicked', '49s gap']
];

const FEED_STYLE = {
  sent: 'ok', opened: 'ok', clicked: 'info', replied: 'brand', bounced: 'warn'
};

const BLOCKS = [
  ['Heading', 'Book a 15-minute teardown'],
  ['Text', 'Hi {{first_name|there}}, saw {{company|your team}} is hiring SDRs…'],
  ['Button', 'Pick a slot'],
  ['Divider', ''],
  ['Unsubscribe', 'One click, kept for compliance']
];

export default function LiveConsole() {
  const [tab, setTab] = useState('cadence');
  const [gap, setGap] = useState(70);
  const [feed, setFeed] = useState(() => FEED_POOL.slice(0, 4));
  const [submissions, setSubmissions] = useState(37);
  const [paused, setPaused] = useState(false);
  const cursor = useRef(4);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      const next = FEED_POOL[cursor.current % FEED_POOL.length];
      cursor.current += 1;
      setFeed(rows => [next, ...rows].slice(0, 5));
      if (cursor.current % 3 === 0) setSubmissions(n => n + 1);
    }, 2100);
    return () => clearInterval(id);
  }, [paused]);

  const hourly = useMemo(() => Math.round(3600 / Math.max(20, gap)), [gap]);
  const perDay = useMemo(() => hourly * 8, [hourly]); // 8-hour working window

  return <div className="hm-console" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="hm-console-bar">
      <span className="hm-dots"><i /><i /><i /></span>
      <span className="hm-url">emavanta.com/dashboard</span>
      <span className="hm-live"><span className="hm-live-dot" />interactive demo</span>
    </div>

    <div className="hm-console-body">
      <nav className="hm-rail" aria-label="Demo views">
        {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}
          title={t.label} aria-label={t.label}>{t.icon}</button>)}
      </nav>

      <div className="hm-panel">
        <div className="hm-tabs" role="tablist">
          {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        <div className="hm-kpis">
          <div><span>Sends today</span><b>1,284</b><em className="up">+12%</em></div>
          <div><span>Replies</span><b>38</b><em>3.1%</em></div>
          <div><span>Account health</span><b>98</b><em className="up">/100</em></div>
        </div>

        {tab === 'cadence' && <>
          <div className="hm-feed" aria-live="polite">
            {feed.map(([email, status, note], i) => <div className={`hm-feed-row ${i === 0 ? 'fresh' : ''}`} key={`${email}-${i}`}>
              <span className={`hm-chip ${FEED_STYLE[status] || ''}`}>{status}</span>
              <span className="hm-mail">{email}</span>
              <span className="hm-note">{note}</span>
            </div>)}
          </div>
          <div className="hm-slider">
            <div className="mini-row">
              <label htmlFor="hm-gap">Gap between sends</label>
              <b>{gap}s</b>
            </div>
            <input id="hm-gap" type="range" min="20" max="180" step="5" value={gap}
              onChange={e => setGap(Number(e.target.value))} />
            <p className="hm-slider-note">
              ≈ <b>{hourly}</b> emails per hour per mailbox · <b>{perDay.toLocaleString()}</b> in an 8-hour day.
              Jitter and working hours apply on top.
            </p>
          </div>
        </>}

        {tab === 'templates' && <div className="hm-blocks">
          {BLOCKS.map(([type, text]) => <div className="hm-block" key={type}>
            <span className="hm-block-type">{type}</span>
            <span className="hm-block-text">{text || '—'}</span>
          </div>)}
          <p className="hm-fine">Visual blocks and raw HTML in one document · tokens with fallbacks · sanitizer on save.</p>
        </div>}

        {tab === 'automation' && <div className="hm-flow">
          {[['Trigger', 'Form submitted: Newsletter'], ['Wait', '2 days'], ['Email', 'Welcome — step 1'],
            ['Condition', 'If no reply → continue'], ['Email', 'Follow-up with a case study']].map(([kind, text], i) =>
            <div className="hm-node" key={i}>
              <span className={`hm-node-dot ${kind.toLowerCase()}`} />
              <span className="hm-node-kind">{kind}</span>
              <span className="hm-node-text">{text}</span>
            </div>)}
          <p className="hm-fine">Replies pause the flow automatically. Every wait respects working hours.</p>
        </div>}

        {tab === 'forms' && <div className="hm-form">
          <div className="hm-form-card">
            <b>Get the Friday brief</b>
            <span className="hm-input" aria-hidden="true">you@company.com</span>
            <span className="hm-btn" aria-hidden="true">Subscribe</span>
          </div>
          <div className="hm-form-side">
            <div className="hm-form-count"><b>{submissions}</b><span>submissions</span></div>
            <p className="hm-fine">Embeds on any site · lands as a contact · can start the automation on the left.</p>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

import Link from 'next/link';
import FAQ from '../../components/FAQ';
import Reveal from '../../components/Reveal';
import { FALLBACK_PLANS, FALLBACK_ADDONS, fmtLimit } from '../../lib/plans';

export const metadata = { alternates: { canonical: '/' } };

const I = {
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  wave: <><path d="M2 15c2.5 0 2.5-6 5-6s2.5 6 5 6 2.5-6 5-6 2.5 6 5 6" /></>,
  grid: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M3.5 9.5h17M9.5 3.5v17" /></>,
  form: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h4" /></>,
  flow: <><rect x="3" y="3" width="7" height="6.5" rx="1.8" /><rect x="14" y="14.5" width="7" height="6.5" rx="1.8" /><path d="M6.5 9.5v4a3 3 0 0 0 3 3h8" /></>,
  reply: <><path d="M9 8 4 12l5 4" /><path d="M4 12h9a6 6 0 0 1 6 6v1" /></>,
  agency: <><rect x="3" y="8" width="18" height="12" rx="2.5" /><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M3 13.5h18" /></>,
  shield: <><path d="M12 3.5 5 6.2v5.3c0 4 2.9 7.3 7 9 4.1-1.7 7-5 7-9V6.2Z" /><path d="m9.2 12 2 2 3.6-3.8" /></>,
};
const modules = [
  ['target', 'Outreach engine', 'Connect your own SMTP sending account. Sequences, branching, warmup and reply detection in one place.', '/features/outreach'],
  ['mail', 'Campaigns', 'Account pools, rotation strategies, preflight checks and outbox-backed delivery with deterministic retries.', '/features/campaigns'],
  ['wave', 'Human-like cadence', 'You choose 30s, 1min or your own range. Jitter, working hours, timezone windows, daily caps and pause-on-reply.', '/features/deliverability'],
  ['grid', 'Two-mode templates', 'Drag-and-drop blocks and custom HTML in one canonical document. Tokens, fallbacks, sanitizer and versions.', '/features/templates'],
  ['form', 'Hosted forms', 'Build a signup or newsletter form, embed it on your own site, and every submission becomes a contact you can automate.', '/dashboard/forms'],
  ['flow', 'Automation', 'Triggers, conditions, delays and actions driven by a long-horizon scheduled-jobs poller — forms included.', '/features/automation'],
  ['reply', 'Reply attribution', 'Replies pause the right sequence and appear on the campaign timeline with the account that received them.', '/features/analytics'],
  ['agency', 'Agency workspaces', 'Client portals, approvals, shared assets and per-client usage limits — part of the product, not an add-on.', '/features/agency'],
  ['shield', 'Tenant isolation', 'Every query is organization-scoped. RBAC, TOTP two-factor, encrypted credentials and a hash-chained audit log.', '/features/deliverability']
];

const steps = [
  ['1', 'Connect', 'Add SMTP or ESP credentials. Credentials are encrypted at rest and never logged.'],
  ['2', 'Build', 'Tokens with fallbacks, conditional blocks, drag-drop or code, plus a preflight that refuses to send something broken.'],
  ['3', 'Orchestrate', 'Pick accounts, rotation strategy, cadence policy and launch. The outbox and workers do the rest — no hosted page, no redirect.'],
  ['4', 'Measure', 'Replies, bounces, complaints, clicks and per-account health in one dashboard, with insights from recorded delivery events.']
];

const audiences = [
  ['Solo founder', 'One dashboard, one sequence, a personal touch at 45–90s intervals.'],
  ['SDR team', 'Shared templates and lists, assigned conversations, manager approvals.'],
  ['Agency', 'Client workspaces, white-label portals, per-client limits and approvals.'],
  ['Product teams', 'Keep transactional and marketing work organized by stream.'],
  ['Recruiters', 'Personalized first lines, fallbacks and working-hour pacing.'],
  ['Consultants', 'One workspace for outreach, CRM deals and follow-up tasks.']
];

export default function Home() {
  return <>
    {/* ---------------------------------------------------------------- */}
    {/* Hero                                                             */}
    {/* ---------------------------------------------------------------- */}
    <section className="hero2 hero-luxe hm-hero hm-hero-premium">
      <div className="hero-copy">
        <div className="hm-eyebrow"><span/> A MORE THOUGHTFUL WAY TO EMAIL</div>
        <h1>Better emails.<br/><span className="hm-hero-accent">Bigger impact.</span></h1>
        <p className="lead">Bring your own mailbox. Build thoughtful campaigns, grow your audience and keep every conversation moving—in one beautiful workspace.</p>
        <div className="row hero-actions">
          <Link className="btn btn-lg hm-main-cta" href="/signup">Start for free <span aria-hidden="true">↗</span></Link>
          <Link className="btn secondary btn-lg hm-alt-cta" href="/features">Explore the platform <span aria-hidden="true">→</span></Link>
        </div>
        <div className="hm-hero-bottom"><span><i>✓</i> Your own sending accounts</span><span><i>✓</i> No card to start</span></div>
      </div>
      <div className="hero-art hm-art hm-premium-art" aria-label="Abstract illustration of an email envelope in orbit">
        <img src="/hero-email-redesign.webp" alt="" width="1568" height="981" fetchPriority="high" decoding="async" />
        <div className="hm-orbit-note"><span>✳</span><div><b>Made for meaningful connections</b><small>Your email, beautifully organized</small></div></div>
        <div className="hm-art-caption"><span className="hm-art-icon">✦</span><div><strong>Everything in its place.</strong><small>Campaigns · Contacts · Automation</small></div></div>
        <div className="hm-art-tag"><span/> YOUR WORKSPACE, YOUR WAY</div>
      </div>
    </section>
    <div className="container hm-trust-strip"><span>MADE FOR THOUGHTFUL OUTREACH</span><b>Campaigns</b><b>Automation</b><b>Hosted forms</b><b>Insights</b></div>

    {/* ---------------------------------------------------------------- */}
    {/* The point of difference                                          */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container" style={{ paddingTop: 20 }}>
      <div className="split">
        <Reveal>
          <div className="section-tag">A different kind of email tool</div>
          <h2 className="section-title">We are not your ESP. That is the point.</h2>
          <p className="section-sub">
            You bring the mailbox, the domain and the reputation. We bring the queue, the
            personalization engine, the cadence pacer, team controls and the numbers. Separate workflows help you manage transactional and marketing email.
          </p>
          <div className="why-row">
            <div><b>One account, one lane</b>Organize sending accounts by stream and monitor their status.</div>
            <div><b>No resold delivery</b>We never touch your provider relationship or your IP reputation.</div>
            <div><b>No surprise bill</b>Review plan allowances and mailbox limits before launching.</div>
            <div><b>Nothing hidden</b>Every number in the dashboard is computed from your own events, not a marketing feed.</div>
          </div>
          <div className="row" style={{ marginTop: 20 }}>
            <Link href="/features/deliverability" className="btn secondary">Deliverability tools →</Link>
            <Link href="/features" className="btn ghost">All features</Link>
          </div>
        </Reveal>
        <Reveal delay={90}>
          <div className="window hm-window">
            <div className="window-bar"><i /><i /><i /><span>outreach · illustrative example</span></div>
            <div className="window-body">
              <div className="mini-row" style={{ justifyContent: 'space-between' }}>
                <b style={{ color: '#12233a' }}>Sequence · Q3 prospects</b><span className="badge ok">Running</span>
              </div>
              <div className="progress" style={{ margin: '14px 0' }}><i style={{ width: '68%' }} /></div>
              <ul className="timeline">
                {[['lead1@example.com', 'sent · 62s gap'], ['lead2@example.com', 'sent · 65s gap'],
                  ['lead3@example.com', 'sent · 47s gap'], ['lead4@example.com', 'paused · replied']].map(([e, s]) =>
                  <li key={e}><span className="dot" /><span>{e}</span><span className="t">{s}</span></li>)}
              </ul>
              <div className="muted" style={{ marginTop: 14, fontSize: 12 }}>
                Policy: 45–90s ±20% jitter · 09:00–18:00 · 50/day · pause on reply
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Hosted forms showcase (new)                                      */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal>
        <div className="hm-forms-band">
          <div className="hm-forms-copy">
            <div className="section-tag">New · hosted forms</div>
            <h2 className="section-title">Your website’s form, your workspace’s lead</h2>
            <p className="section-sub">
              Build a newsletter, waitlist or contact form in the dashboard. Host it on our page,
              drop an iframe anywhere, or paste plain HTML that posts straight to your workspace.
              Every submission lands as a contact — deduped by email — and can start an automation
              on the spot.
            </p>
            <ul className="hm-check">
              <li>One contact per email, never duplicated</li>
              <li>Assigns a list, tags and a source you can filter on</li>
              <li>Honeypot and per-IP limits, so bots do not pollute your data</li>
              <li>CSV export of every submission</li>
            </ul>
            <div className="row" style={{ marginTop: 18 }}>
              <Link className="btn" href="/signup">Build your first form</Link>
              <Link className="btn secondary" href="/features/automation">See the automation side →</Link>
            </div>
          </div>
          <div className="hm-forms-art">
            <div className="hm-form-preview">
              <b>Get the Friday brief</b>
              <p>One short email a week — deliverability, copy that lands, and what is working.</p>
              <span className="hm-input">you@company.com</span>
              <span className="hm-btn">Subscribe</span>
              <small>No spam. Unsubscribe any time.</small>
            </div>
            <pre className="hm-snippet">{`<iframe src="https://app.emavanta.com/f/friday-brief"
  style="width:100%;max-width:520px;height:520px;border:0">
</iframe>`}</pre>
          </div>
        </div>
      </Reveal>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Modules                                                          */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal>
        <div className="section-tag">The platform</div>
        <h2 className="section-title">Everything the full system needs</h2>
        <p className="section-sub">Bring your workflows together, from first draft to follow-up.</p>
      </Reveal>
      <div className="cards3 hm-modules">
        {modules.map(([icon, title, body, href], i) => <Reveal key={title} delay={i * 40}>
          <Link className="card2 hm-module" href={href}>
            <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[icon]}</svg></div>
            <h3>{title}</h3>
            <p>{body}</p>
            <span className="hm-module-link">Open →</span>
          </Link>
        </Reveal>)}
      </div>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Steps + stats                                                    */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal>
        <h2 className="section-title">From idea to reply in four steps</h2>
      </Reveal>
      <div className="hm-steps">
        {steps.map(([n, t, b], i) => <Reveal key={n} delay={i * 60}>
          <div className="hm-step">
            <span className="hm-step-n">{n}</span>
            <h3>{t}</h3>
            <p>{b}</p>
          </div>
        </Reveal>)}
      </div>

      <Reveal>
        <div className="stats-band" style={{ marginTop: 26 }}>
          <div><div className="stat">45–90s</div><div className="muted">default human cadence</div></div>
          <div><div className="stat">250</div><div className="muted">recipients per bulk batch</div></div>
          <div><div className="stat">3</div><div className="muted">isolated mail streams</div></div>
          <div><div className="stat">1</div><div className="muted">workspace for your workflow</div></div>
        </div>
      </Reveal>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Pricing teaser                                                   */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal>
        <div className="split">
          <div>
            <div className="section-tag">Pricing</div>
            <h2 className="section-title">Flat workspace pricing, not per seat</h2>
            <p className="section-sub">
              Capacity, not resold email credits. A five-person team on Growth pays $49 a month —
              the same plan a single founder uses. Raise one limit with an add-on instead of
              jumping a whole tier.
            </p>
            <div className="why-row">
              <div><b>Compared with per-seat tools</b>A 5-person team on a $79/user plan pays $395/mo before add-ons. Growth is $49/mo flat with 10 seats.</div>
              <div><b>Compared with ESP bundles</b>They sell sending and charge for it. We sell the software around accounts you already own.</div>
            </div>
            <Link className="btn" href="/pricing" style={{ marginTop: 20 }}>Compare all plans</Link>
          </div>
          <Reveal delay={80}>
            <pre className="codebox">
{[
  'PLAN        MONTHLY     SENDS/MO    CONTACTS    SEATS',
  ...FALLBACK_PLANS.map(({ name, monthly, limits }) =>
    name.padEnd(12) + (`$${monthly}`).padEnd(12) + fmtLimit(limits.sends).padEnd(12) +
    fmtLimit(limits.contacts).padEnd(12) + (limits.seats < 0 ? '∞' : fmtLimit(limits.seats))),
  '',
  ...['seats5', 'sends25k', 'contacts10k', 'clients5', 'mailbox5'].map(code => {
    const addon = FALLBACK_ADDONS.find(a => a.code === code);
    return `${addon.label}  $${addon.price}/mo`;
  })
].join('\n')}
            </pre>
          </Reveal>
        </div>
      </Reveal>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Who it is for                                                    */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal><h2 className="section-title">Built for every kind of sender</h2></Reveal>
      <div className="cards3">
        {audiences.map(([t, b], i) => <Reveal key={t} delay={i * 40}>
          <div className="card2"><h3>{t}</h3><p>{b}</p></div>
        </Reveal>)}
      </div>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Security                                                         */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal>
        <div className="hm-security">
          <div>
            <div className="section-tag">Security &amp; ownership</div>
            <h2 className="section-title" style={{ marginBottom: 10 }}>Built like the data is yours</h2>
            <p className="section-sub" style={{ marginBottom: 0 }}>
              Organization-scoped queries, role-based permissions, TOTP two-factor with one-time
              recovery codes, encrypted mailbox credentials and an append-only, hash-linked audit
              log you can verify yourself.
            </p>
          </div>
          <div className="hm-security-grid">
            {[['TOTP 2FA', 'Code at sign-in, 10 single-use recovery codes'],
              ['Audit chain', 'Every action hash-linked to the previous one'],
              ['RBAC', '7 roles, workspace-scoped access'],
              ['Soft delete', 'Account controls retain workspace and audit records']].map(([t, b]) =>
              <div key={t}><b>{t}</b><span>{b}</span></div>)}
          </div>
        </div>
      </Reveal>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* Quotes                                                           */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal><h2 className="section-title">Built around your priorities</h2></Reveal>
      <div className="quote-row">
        {[
          ['Predictable workspace pricing', 'Choose a plan and add capacity when you need it.'],
          ['Sending controls', 'Set cadence, working hours and per-account limits.'],
          ['Team collaboration', 'Organize client workspaces, shared assets and approvals.']
        ].map(([title, body], i) =>
          <Reveal key={title} delay={i * 60}><div className="quote"><b>{title}</b><p>{body}</p></div></Reveal>)}
      </div>
    </section>

    {/* ---------------------------------------------------------------- */}
    {/* CTA + FAQ                                                        */}
    {/* ---------------------------------------------------------------- */}
    <section className="section container">
      <Reveal>
        <div className="footer-cta hm-cta">
          <div>
            <h2 className="section-title" style={{ marginBottom: 6 }}>Ready when you are</h2>
            <p className="section-sub" style={{ margin: 0 }}>Start with the free plan and choose the capacity you need.</p>
          </div>
          <div className="row">
            <Link className="btn btn-lg" href="/signup">Create your workspace</Link>
            <Link className="btn secondary btn-lg" href="/signin">Sign in</Link>
          </div>
        </div>
      </Reveal>
    </section>

    <section className="section container" style={{ paddingTop: 0 }}>
      <h2 className="section-title">Questions</h2>
      <FAQ items={[
        ['Do you provide email sending or mailboxes?', 'No. You connect your own Google, Microsoft, SMTP or ESP account. We never resell email delivery or IPs.'],
        ['Who is responsible for the emails and consent?', 'You are the sender and controller. Our platform is a tool; the Terms make this explicit. We provide hygiene tools (suppression, unsubscribe, consent fields) but do not sell a compliance certification.'],
        ['Can I control the sending speed?', 'Yes. Per account you set minimum/maximum delay, jitter, working hours, timezone and daily/weekly caps. The default is a balanced 45–90 seconds.'],
        ['What happens when I hit a plan limit?', 'Review your plan limits and available add-ons on the billing page.'],
        ['Drag-and-drop or code?', 'Both, in the same template. Switching modes preserves your work, and unsupported custom markup is kept as a raw block.'],
        ['Can I use this for agency clients?', 'Yes. Client workspaces, scoped roles, shared templates and approvals are part of the product, not an enterprise afterthought.'],
        ['Do the hosted forms work on my own website?', 'Yes — that is what they are for. Each form has a hosted page, an iframe snippet and a plain HTML snippet that posts to your workspace from any domain.']
      ]} />
    </section>
  </>;
}

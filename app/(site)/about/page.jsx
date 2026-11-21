import Link from 'next/link';
export const metadata={description: 'Learn about Emavanta and its approach to email software for teams using their own sending accounts.', alternates: { canonical: '/about' }, title:'About — Emavanta'};

const principles = [
  ['The sender is the customer','You own the mailbox, the domain, the consent and the reputation. We are software, not the sender.'],
  ['No business logic in the UI','Validation, authorization and orchestration live in services, where they can be tested.'],
  ['Idempotent by default','Every queue job, webhook and billing event can be replayed safely.'],
  ['Failure must be visible','Retries, dead letters, alerts and audit trails beat silent data loss.'],
  ['Predictable money','Flat USD workspace pricing and opt-in packs. No resold email credits.'],
  ['Rollback-able','Every deployment and every schema change has a way back.']
];

export default function About(){return <>
 <section className="hero2 container">
  <div className="badge ok">About Emavanta</div>
  <h1 style={{fontSize:50}}>Software for people who own their sending</h1>
  <p className="lead">Emavanta started from a simple frustration: email tools either sell you their sending infrastructure or charge you per seat for software. We built the third option — an advanced engine for accounts you already control.</p>
  <div className="strip">{['Founded in Vilnius','User-owned sending','JS/JSX monorepo','Open documentation','Account security'].map(x=><span className="chip" key={x}>{x}</span>)}</div>
 </section>

 <section className="section container">
  <div className="split"><div>
    <div className="section-tag">Our position</div>
    <h2 className="section-title">Clear separation, fewer surprises</h2>
    <p className="section-sub">You bring the account, the domain and the reputation. We bring the queue, the personalization engine, the cadence pacer, team controls and the numbers. When reputation belongs to the sender, the software should make that sender's job easier — not hide it behind a black box.</p>
    <Link className="btn" href="/changelog">See what shipped →</Link>
  </div><div className="card2">
    <h3>What we will never sell</h3>
    <ul className="feat">
      <li>Email-sending APIs</li><li>Mailboxes or inboxes</li><li>Shared IPs or dedicated IPs</li>
      <li>A "GDPR compliant" certificate</li><li>Delivery guarantees</li><li>Per-seat surprises</li>
    </ul>
  </div></div>
 </section>

 <section className="section container">
  <h2 className="section-title">How we work</h2>
  <div className="cards3">{principles.map(([t,b],i)=><div className="card2" key={t}>
    <div className="icon">{String(i+1).padStart(2,'0')}</div><h3>{t}</h3><p>{b}</p></div>)}</div>
 </section>

 <section className="section container">
  <div className="stats-band">
    <div><div className="stat">48</div><div className="muted">automated tests</div></div>
    <div><div className="stat">44</div><div className="muted">app routes</div></div>
    <div><div className="stat">15+</div><div className="muted">shared packages &amp; modules</div></div>
    <div><div className="stat">0</div><div className="muted">mailboxes sold</div></div>
  </div>
 </section>

 <section className="section container">
  <div className="split"><div>
    <h2 className="section-title">Built in the open</h2>
    <p className="section-sub">Architecture, database design, security decisions, deliverability approach, pricing and runbooks are published as documentation in the repository. You should be able to audit the design before you trust it with a campaign.</p>
    <Link className="btn secondary" href="/changelog">See what shipped →</Link>
  </div><div className="codebox">{`frontend/     Next.js public site + dashboard
backend/      Node.js API and workers
backend/packages/ database · queue · providers · engine
              deliverability · rate-limiter · security
              entitlements · observability

Connect persistent storage and your own sending accounts.`}</div></div>
 </section>

 <section className="section container" style={{textAlign:'center'}}>
  <div className="footer-cta" style={{justifyContent:'center',flexDirection:'column',gap:14}}>
   <div><h2 className="section-title" style={{marginBottom:4}}>Come build with us</h2><p className="section-sub" style={{margin:'0 auto'}}>Questions about architecture, plans or integrations? We answer personally.</p></div>
   <div className="row"><Link className="btn btn-lg" href="/signup">Create workspace</Link><Link className="btn secondary btn-lg" href="/contact">Talk to us</Link></div>
  </div>
 </section>
</>;}

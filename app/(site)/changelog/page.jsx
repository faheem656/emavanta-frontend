import Link from 'next/link';
export const metadata={description: 'See product updates and changes to the Emavanta platform.', alternates: { canonical: '/changelog' }, title:'Changelog — Emavanta'};
const releases=[
 ['0.3.0','2026-11-19','Emavanta branding',['New logo and light-theme identity across site and dashboard','emavanta.com used for product links and support addresses','Pricing now renders instantly from a shared, offline-safe catalogue','Premium page layouts, comparison table and real product content across all public pages']],
 ['0.2.0','2026-11-19','Advanced platform',['Transactional outbox and checkpointed 25–250 recipient batches','Tenant-scoped rate limiting with critical/bulk/outreach lanes','Rotating sessions, authenticator-based 2FA, envelope encryption and audit-chain verification','Deliverability toolkit, CSV import, personalization registry, SLOs and runbooks']],
 ['0.1.0','2026-11-19','Foundation',['Next.js public site + dashboard, Fastify internal service and worker entrypoint','OAuth Google/Microsoft, SMTP and user-owned ESP connectors with encrypted credentials','Outbox → MongoDB queue → workers → provider → delivery events','Personalization, human cadence pacer, account rotation and dual-mode templates','RBAC, tenant isolation, audit chain, USD plans, add-ons and Stripe surface']]
];
export default function Changelog(){return <>
 <section className="hero2 container"><div className="badge ok">Changelog</div><h1 style={{fontSize:46}}>What shipped</h1><p className="lead">A working product, improved in vertical slices — not a promise on a slide.</p></section>
 <section className="section container" style={{maxWidth:840}}>
  <div className="timeline-v">{releases.map(([v,d,t,items])=><div className="item" key={v}>
   <div className="row"><h3 style={{margin:0}}>{t}</h3><span className="badge ok">{v}</span><span className="muted">{d}</span></div>
   <ul className="feat">{items.map(i=><li key={i}>{i}</li>)}</ul>
  </div>)}</div>
  <Link className="btn secondary" href="/pricing">See pricing →</Link>
 </section>
</>;}

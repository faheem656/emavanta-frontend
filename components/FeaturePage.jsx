import Link from 'next/link';
import FeatureHero from './FeatureHero';
import FAQ from './FAQ';

const defaultSteps = [
  ['Connect','Add one of your own Google, Microsoft, SMTP or ESP accounts. Credentials are encrypted.'],
  ['Configure','Choose accounts, personalization tokens, cadence and the guardrails that fit your workflow.'],
  ['Launch','Preflight, quota reserve and the outbox relay hand work to durable workers.'],
  ['Review','Watch replies, bounces and health in one dashboard; pause anything that looks wrong.']
];

export default function FeaturePage({ eyebrow, title, lead, chips = [], sections = [], code,
  cta = 'Start free', steps = defaultSteps, faq = [], related = [] }){
  const questions = faq.length ? faq : [
    ['Does this include email sending?','No. Emavanta is software around the accounts you own. You connect your provider and pay them directly.'],
    ['Is there a free trial?','Yes — 14 days of Growth features with no card. Your data stays yours if you downgrade.'],
    ['Can a team use this together?','Yes. Roles, shared templates, approvals and client workspaces are first-class features.']
  ];
  return <>
    <FeatureHero eyebrow={eyebrow} title={title} lead={lead} bullets={chips}/>
    {code && <section className="section container" style={{paddingTop:8}}><div className="codebox">{code}</div></section>}

    <section className="section container" style={{paddingTop:10}}>
      <div className="section-tag">Capability</div>
      <h2 className="section-title">What you actually get</h2>
      <div className="cards3">{sections.map(s=><div className="card2" key={s.title}>
        <div className="icon">{s.icon||'•'}</div><h3>{s.title}</h3><p>{s.body}</p>
        {s.points && <ul className="feat">{s.points.map(p=><li key={p}>{p}</li>)}</ul>}
      </div>)}</div>
    </section>

    <section className="section container" style={{paddingTop:10}}>
      <div className="section-tag">Workflow</div>
      <h2 className="section-title">How it works</h2>
      <div className="timeline-v">
        {steps.map(([t,b],i)=><div className="item" key={t}>
          <h3>{i+1}. {t}</h3><p>{b}</p>
        </div>)}
      </div>
    </section>

    <section className="section container" style={{paddingTop:0}}>
      <h2 className="section-title">Good to know</h2>
      <FAQ items={questions}/>
    </section>

    {related.length>0 && <section className="section container" style={{paddingTop:10}}>
      <h2 className="section-title">Explore related modules</h2>
      <div className="doc-grid">{related.map(([href,title,body])=><Link href={href} className="doc-card" key={href}>
        <h3>{title} →</h3><p>{body}</p>
      </Link>)}</div>
    </section>}

    <section className="section container" style={{textAlign:'center'}}>
      <div className="footer-cta" style={{justifyContent:'center',flexDirection:'column',gap:14}}>
        <div><h2 className="section-title" style={{marginBottom:4}}>Try {eyebrow.toLowerCase()} in your own workspace</h2>
          <p className="section-sub" style={{margin:'0 auto'}}>14 days of Growth features, no card required. Keep your data if you downgrade.</p></div>
        <Link className="btn btn-lg" href="/signup">{cta}</Link>
      </div>
    </section>
  </>;
}

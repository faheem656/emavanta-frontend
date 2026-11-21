export default function FeatureHero({ eyebrow, title, lead, bullets = [] }) {
  return <header className="hero2 feature-premium" style={{paddingBottom:30}}>
    <div className="feature-orbit" aria-hidden="true"><span>✦</span><i>✉</i><b>✳</b></div>
    <div className="badge ok">{eyebrow}</div>
    <h1 style={{fontSize:46}}>{title}</h1>
    <p className="lead">{lead}</p>
    {bullets.length>0 && <div className="strip">{bullets.map(b=><span className="chip" key={b}>{b}</span>)}</div>}
  </header>;
}

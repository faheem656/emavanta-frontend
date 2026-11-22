import Link from 'next/link';
const cols = [
  ['Product',[['/features/outreach','Cold outreach'],['/features/campaigns','Campaigns'],['/features/templates','Templates'],['/features/automation','Automation'],['/features/analytics','Analytics'],['/features/deliverability','Deliverability'],['/pricing','Pricing']]],
  ['Company',[['/about','About us'],['/status','System status'],['/changelog','Changelog'],['/contact','Contact'],['/signup','Get started']]],
  ['Legal',[['/legal/privacy','Privacy'],['/legal/terms','Terms'],['/legal/cookies','Cookies']]]
];
export default function MarketingFooter(){
  return <footer className="footer"><div className="container"><div className="footer-grid">
    <div><div className="logo"><img className="logo-wordmark" src="/emavanta-logo.webp" alt="Emavanta" /></div>
      <p className="muted" style={{maxWidth:310,lineHeight:1.7,marginTop:14}}>The outreach and marketing engine for teams who own their sending. Your accounts, your domain, your reputation — orchestrated properly.</p>
      <p className="muted">hello@emavanta.com<br/>Vilnius, Lithuania</p></div>
    {cols.map(([title,links])=><div key={title}><h4>{title}</h4>{links.map(([h,l])=><Link key={h} href={h}>{l}</Link>)}</div>)}
  </div><p className="muted" style={{marginTop:32,fontSize:12}}>© {new Date().getFullYear()} Emavanta UAB · Not an email provider. The customer is the sender and is responsible for their messages.</p></div></footer>;
}

import Link from 'next/link';
import Icon from './Icon';

/** Decorative illustration only; no simulated analytics or customer data. */
export default function DashboardBanner({variant}) {
 const automation=variant==='automation';
 return <section className={`dashboard-feature-banner ${automation?'automation-banner':'campaign-banner'}`}>
  <div className="dashboard-feature-copy">
   <span className="dashboard-feature-kicker">{automation?'WORKFLOW STUDIO':'CAMPAIGN WORKSPACE'}</span>
   <h2>{automation?'Design the journey, beautifully.':'Make every message matter.'}</h2>
   <p>{automation?'Map your ideas into reusable workflow drafts. Execution is not available yet.':'Bring your audience, content and sending plan together in one thoughtful campaign.'}</p>
   <Link className="dashboard-feature-cta" href={automation?'/dashboard/automation/new':'/dashboard/campaigns/new'}><Icon name="plus" size={15}/>{automation?'Create a workflow':'Create a campaign'}</Link>
  </div>
  <div className="dashboard-feature-art" aria-hidden="true">
   {automation ? <div className="banner-workflow"><div><i>✦</i><span><b>Start</b><small>Workflow trigger</small></span></div><div className="banner-flow-line"/><div><i>✉</i><span><b>Message</b><small>Email step</small></span></div><div className="banner-flow-line"/><div><i>◷</i><span><b>Wait</b><small>Next step</small></span></div></div>
    : <div className="banner-message"><div className="banner-msg-head"><i>✉</i><span>YOUR CAMPAIGN</span><b>✦</b></div><div className="banner-msg-title"/><div className="banner-msg-line"/><div className="banner-msg-line short"/><div className="banner-msg-button"/><div className="banner-float">↗</div></div>}
  </div>
 </section>;
}

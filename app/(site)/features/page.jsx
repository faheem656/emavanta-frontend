import Link from 'next/link';
import FeatureHero from '../../../components/FeatureHero';
export const metadata = { title:'Email platform features — Emavanta', description:'Explore email campaigns, outreach, automation, templates and analytics for teams using their own sending accounts.', alternates:{canonical:'/features'} };
const features = [
  ['campaigns','Campaigns','Plan and manage campaigns using your own sending accounts.'],
  ['outreach','Outreach','Organize personalized outreach and follow-up workflows.'],
  ['automation','Automation','Build workflows around your contacts and activity.'],
  ['templates','Templates','Create reusable email content for your team.'],
  ['analytics','Analytics','Review campaign activity and performance.'],
  ['deliverability','Deliverability','Monitor sending accounts and manage sending health.'],
  ['agency','Agency workspaces','Organize work across clients and teams.']
];
export default function Features(){return <><FeatureHero eyebrow="Explore Emavanta" title="One workspace for thoughtful email" lead="Bring your own sending accounts and organize campaigns, outreach, contacts and workflows in one place." bullets={['Your accounts','Your contacts','Your workflows']} /><section className="section container"><div className="section-tag">Explore the platform</div><h2 className="section-title">Tools for every step</h2><div className="doc-grid">{features.map(([slug,title,body])=><Link className="doc-card" href={`/features/${slug}`} key={slug}><h3>{title} →</h3><p>{body}</p></Link>)}</div></section></>;}

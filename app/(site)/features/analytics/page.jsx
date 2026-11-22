import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Explore email campaign and outreach analytics in Emavanta.', alternates: { canonical: '/features/analytics' }, title:'Analytics — Emavanta'};
export default function Page(){return <FeaturePage related={[['/features/deliverability','Deliverability','Account health and reputation advisory.'],['/features/campaigns','Campaigns','See what each campaign produced.'],['/features/outreach','Outreach','Replies, not just opens.']]} eyebrow="Analytics" title="Numbers you can argue with" lead="Pre-aggregated rollups, per-account breakdowns and a single metric dictionary. Opens are shown but never treated as proof of engagement."
 chips={['Rollups','Per-account','Per-template','Bounces','Complaints','Conversions']}
 code={`primary: delivered · clicked · replied · bounced · complained
secondary: opened (Apple MPP prefetch makes it unreliable)`}
 sections={[
  {icon:'▤',title:'One definition everywhere',body:'Dashboard, invoices and exports use the same metric definitions, so numbers never disagree.',points:['Metric glossary','Immutable usage records','Nightly reconciliation','Export to CSV']},
  {icon:'◎',title:'Deliverability view',body:'Per-account health, DNS status, bounce/complaint rates and warmup progress in one place.',points:['Health score','Threshold alerts','Provider mix','Seed tests']},
  {icon:'↗',title:'Attribution',body:'Link tracking, UTMs and per-template versions connect a click back to the exact email and account that produced it.',points:['Fast redirect service','Conversion events','Client reports','Custom date ranges']}
 ]}/>;}

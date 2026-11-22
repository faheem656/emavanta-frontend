import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Explore tools for managing sending health and deliverability.', alternates: { canonical: '/features/deliverability' }, title:'Deliverability support — Emavanta'};
export default function Page(){return <FeaturePage related={[['/features/outreach','Outreach','Cadence and warmup in action.'],['/features/campaigns','Campaigns','Stream isolation on launch.'],['/features/analytics','Analytics','Health and complaint metrics.']]} eyebrow="Deliverability" title="You own the reputation. We give you instruments." lead="SPF/DKIM/DMARC verification, suppression logic, bounce classification, warmup scheduling and inbox placement tests for the accounts you connect."
 chips={['DNS advisor','Suppression','Bounce webhooks','Warmup','Seed tests','Health score']}
 sections={[
  {icon:'🔎',title:'Authentication advisor',body:'We render the records you need and verify DNS. You make the change at your registrar; we show the status.',points:['SPF / DKIM / DMARC','CNAME tracking domain','Return-path','DMARC report import']},
  {icon:'⛔',title:'Suppression that actually runs',body:'Hard bounces, complaints and unsubscribes are suppression candidates, checked both when a job is queued and again before send.',points:['One-click unsubscribe','List-Unsubscribe-Post','Physical address field','Consent evidence fields']},
  {icon:'↗',title:'Warmup & pacing',body:'New accounts ramp gradually. Complaint spikes pause the stream and alert you instead of quietly damaging reputation.',points:['Daily ramp','Jittered cadence','Provider-specific caps','Circuit breakers']}
 ]}/>;}

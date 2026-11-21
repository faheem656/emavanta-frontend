import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Create and manage email campaigns with your own sending accounts.', alternates: { canonical: '/features/campaigns' }, title:'Email campaigns — Emavanta'};
export default function Page(){return <FeaturePage related={[['/features/outreach','Outreach','Human-paced 1-to-1 sequences.'],['/features/deliverability','Deliverability','Keep every stream healthy.'],['/features/analytics','Analytics','One metric dictionary for every report.']]} eyebrow="Campaign engine" title="Campaigns with visibility and control" lead="Plan and manage email campaigns using your own sending accounts, with queued work and visibility into delivery status."
 chips={['Outbox pattern','MongoDB queue retries','Dead-letter jobs','Idempotency keys','A/Z ready','Rate limits']}
 code={`POST /campaigns/:id/launch
 → preflight(tokens, links, unsubscribe)
 → reserveQuota(atomic)
 → outbox_events (same Mongo transaction)
 → relay → queue → worker → your account`}
 sections={[
  {icon:'▤',title:'Launch with confidence',body:'A confirmation screen shows the account pool, estimated daily volume and finish date. A dry run renders real messages to seed contacts first.',points:['Preflight blockers','Dry run','Account eligibility','Quota check']},
  {icon:'⇄',title:'Account rotation',body:'Round-robin, weighted, least-used, random-jitter or sticky-by-contact. A failing account cools down and remaining work routes to healthy ones.',points:['No cross-stream failover','Per-account health','SentToday counters','Audit per message']},
  {icon:'♻',title:'Reliable by construction',body:'Queued jobs can be retried; ambiguous provider outcomes should be reviewed before resending.',points:['At-least-once processing','Retry handling','Delivery status','Operational review']},
  {icon:'◧',title:'Separate streams',body:'Transactional, marketing and outreach traffic use different accounts and worker lanes, so a bulk blast never blocks an OTP.',points:['Priority lanes','Per-stream caps','Dedicated domains','Failure isolation']}
 ]}/>;}

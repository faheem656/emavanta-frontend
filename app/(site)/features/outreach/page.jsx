import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Manage personalized outreach and follow-up workflows with your own accounts.', alternates: { canonical: '/features/outreach' }, title:'Human-like cold outreach — Emavanta'};
export default function Page(){return <FeaturePage related={[['/features/campaigns','Campaigns','Outbox-backed bulk sends with rotation.'],['/features/templates','Templates','One document for blocks and code.'],['/features/deliverability','Deliverability','DNS, warmup and suppression tools.']]} eyebrow="Cold outreach" title="Personal at scale. Human by design." lead="Connect your own mailbox, build a sequence, and let a per-account pacer send one message at a time at the speed you choose."
 chips={['OAuth sign-in','30s–1min+ cadence','Jitter','Pause on reply','Warmup','Sequence branching']}
 code={`send_policy = { minDelaySec:45, maxDelaySec:90, jitterPct:20,
  activeHours:{start:9,end:18}, dailyCap:50, pauseOnReply:true }

// one self-rescheduling job per account (not one job per email)
send(recipient) → jitter → nextSendAt() → reschedule`}
 sections={[
  {icon:'◎',title:'Connect the way you want',body:'Sign in with Google or Microsoft via OAuth (PKCE + state), or add SMTP/IMAP and your own ESP credentials. Credentials are encrypted at rest.',points:['Minimum OAuth scopes','Automatic token refresh','Reauth alerts','Per-account caps']},
  {icon:'⌁',title:'Cadence you control',body:'Set your own delay range. We add jitter, respect working hours and timezones, and cap daily/weekly volume. A reply pauses the sequence.',points:['Randomized intervals','Weekend toggle','Warmup ramp','Sticky account per contact']},
  {icon:'✦',title:'Personalization with guardrails',body:'Tokens with fallbacks, conditional blocks and human-paced delivery. Everything is escaped, preflighted and previewed with sample contacts.',points:['No blank greetings','Spam-word checks','Render snapshot','Test send']},
  {icon:'◉',title:'Replies pause the right sequence',body:'Provider reply events are attributed to the campaign that caused them, then pause follow-ups automatically.',points:['Campaign attribution','Auto-pause sequence','Reply events','Audit trail']}
 ]}/>;}

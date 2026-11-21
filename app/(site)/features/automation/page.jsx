import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Organize email automation and contact workflows with Emavanta.', alternates: { canonical: '/features/automation' }, title:'Automation — Emavanta'};
export default function Page(){return <FeaturePage related={[['/features/campaigns','Campaigns','Launch the first email.'],['/features/outreach','Outreach','Human-paced sending.'],['/features/analytics','Analytics','See what each step produced.']]} eyebrow="Automation" title="Workflows with memory" lead="Triggers, conditions, delays and actions — backed by a Mongo scheduled-jobs poller for long horizons and MongoDB queue for immediate work."
 chips={['Workflow builder','Conditions','Delays','Scheduled poller','Webhooks out','Cron']}
 sections={[
  {icon:'⚙',title:'Build visually',body:'Chain email sends, waits, condition checks and internal actions. Branch on contact fields, replies or engagement.',points:['Step-level analytics','Versioned workflows','Clone & share','Dry run']},
  {icon:'◷',title:'Scheduling that scales',body:'Queued jobs and scheduled follow-ups use MongoDB, with retry and recovery checks.',points:['Timezone windows','Blackout dates','Send-time optimization','Resume after restart']},
  {icon:'⇪',title:'Connect your workflow',body:'CRM sync, forms, calendar and clear team handoffs keep follow-up in one place — without reselling sending infrastructure.',points:['CRM sync','Forms & calendar','Role-based access','Rate limits']}
 ]}/>;}

import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Manage email workflows for multiple clients with Emavanta agency workspaces.', alternates: { canonical: '/features/agency' }, title:'Agency workspaces — Emavanta'};
export default function Page(){return <FeaturePage related={[['/pricing','Pricing','Flat workspaces and client packs.'],['/features/campaigns','Campaigns','Approve before a client send.'],['/features/deliverability','Deliverability','Keep each client stream healthy.']]} eyebrow="Agencies" title="One platform, every client" lead="Client workspaces with their own contacts, campaigns, reply tracking, analytics and branding. White-label portals, approvals and per-client limits included."
 chips={['Client portals','White-label','Approvals','Roles','Per-client quotas','Shared assets']}
 sections={[
  {icon:'♟',title:'Workspaces',body:'Each client gets an isolated workspace. Members only see their own scopes; owners and admins can oversee everything.',points:['Tenant-scoped queries','Client role','Archive & restore','Per-client branding']},
  {icon:'✓',title:'Approvals',body:'Drafters prepare campaigns, the client owner approves, and only then does the job enter the queue.',points:['Audit trail','Comment threads','Version compare','Scheduled launch']},
  {icon:'▣',title:'Economics',body:'Plans include client-workspace allowances; +5 portals costs $29/mo. You can allocate usage limits per client.',points:['No per-seat surprises','Usage by client','Invoice export','Founding discount']}
 ]}/>;}

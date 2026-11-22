import FeaturePage from '../../../../components/FeaturePage';
export const metadata={description: 'Create and manage reusable email templates with Emavanta.', alternates: { canonical: '/features/templates' }, title:'Email template builder — Emavanta'};
export default function Page(){return <FeaturePage related={[['/features/outreach','Outreach','Personalized first lines with fallbacks.'],['/features/campaigns','Campaigns','Preflight before launch.'],['/features/automation','Automation','Build follow-up flows.']]} eyebrow="Template builder" title="Drag & drop. Or pure code. Both." lead="One canonical document powers both editors. Switch modes without losing a single character, and ship inline-styled HTML that survives Gmail and Outlook."
 chips={['Blocks ↔ HTML','Sanitizer','Tokens + fallbacks','Versioning','Brand kit','102 KB warning']}
 code={`blocks[]  ⇄  canonical document  ⇄  HTML + inline CSS
{{first_name|there}}  {{company}}  {{#if ...}}...{{/if}}
switchMode('code') → preserves raw_html blocks`}
 sections={[
  {icon:'▦',title:'Visual editor',body:'Headings, text, buttons, images, columns, loops, unsubscribe and legal footer blocks. Responsive preview and accessibility hints.',points:['Brand colors/fonts','Mobile preview','Alt-text warnings','Block library']},
  {icon:'</>',title:'Code editor',body:'Full HTML/CSS with syntax highlighting and a sanitizer that strips scripts, event handlers and javascript: URLs.',points:['HTML import → blocks','Raw blocks preserved','Inline CSS export','Gmail clip warning']},
  {icon:'✦',title:'Personalization',body:'Tokens resolve at send time with fallbacks. Conditional blocks, HTML escaping and preflight catch empty values before a campaign launches.',points:['3-sample preview','Missing-token warnings','Broken-link checks','Unsubscribe enforcement']},
  {icon:'↕',title:'Versions & approvals',body:'Draft → publish, clone, compare versions, and require admin/client approval before a template can be used in a campaign.',points:['Template library','Shared snippets','Per-version analytics','Agency approval flow']}
 ]}/>;}

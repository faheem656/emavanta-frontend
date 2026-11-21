import Link from 'next/link';
export const metadata={description: 'Read the Emavanta terms of service.', alternates: { canonical: '/legal/terms' }, title:'Terms of Service — Emavanta'};
export default function Terms(){return <>
 <section className="hero2 container"><div className="badge">Legal</div><h1 style={{fontSize:46}}>Terms of Service</h1>
  <p className="lead">The rules for using Emavanta. Final wording should be reviewed by counsel before production launch.</p></section>
 <section className="section container prose">
  <div className="legal-note">Summary version. We are not an email service provider and do not send email on your behalf as the sender. You connect your own account and remain responsible for what you send.</div>
  <h2>1. The service</h2>
  <p>Emavanta provides software for campaigns, outreach sequences, personalization, cadence, reply tracking, CRM, analytics and team collaboration. We provide tools, not mailboxes, IPs, delivery guarantees or a public email-sending API.</p>
  <h2>2. Your responsibilities</h2>
  <ul>
   <li>You own the accounts you connect and have permission to use them.</li>
   <li>You are the sender/controller of your messages and responsible for their content, targeting, consent and legal basis.</li>
   <li>You comply with the rules of your provider and with applicable laws, including anti-spam rules in the markets you send to.</li>
   <li>You do not use the service for unlawful, deceptive, harassing or infringing activity.</li>
  </ul>
  <h2>3. Accounts and access</h2>
  <p>One owner per workspace. Roles are Owner, Admin, Member, Viewer, Billing, Client and Super Admin. Invites reserve a seat for 7 days. Credentials must not be shared; access is role-scoped and reviewed in the audit log.</p>
  <h2>4. Plans, billing and refunds</h2>
  <p>Plans are billed in USD monthly or yearly (annual = 10 months). Hard caps pause sends rather than creating surprise charges. Add-on packs are opt-in. Upgrades apply immediately; downgrades take effect at the next cycle. Payments are handled by Stripe; we never store card data.</p>
  <h2>5. Fair use and abuse</h2>
  <p>We may rate-limit, suspend or terminate workspaces that attack infrastructure, send unlawful mail, evade suppression, or pose a security risk. We will give notice where practical.</p>
  <h2>6. Your data</h2>
  <p>You retain ownership of your data. You can export or delete it as described in the <Link href="/legal/privacy">Privacy Policy</Link>. Suppression and audit records may be retained for safety and dispute resolution.</p>
  <h2>7. Liability</h2>
  <p>The service is provided as-is. To the maximum extent permitted by law, Emavanta is not liable for indirect losses, lost profits, or the content and consequences of messages you send. Nothing here limits liability that cannot lawfully be limited.</p>
  <h2>8. Changes</h2>
  <p>Material changes will be announced in the <Link href="/changelog">changelog</Link> or by email before they take effect.</p>
  <h2>9. Contact</h2>
  <p><a href="mailto:legal@emavanta.com">legal@emavanta.com</a> · Emavanta UAB, Vilnius, Lithuania.</p>
 </section>
</>;}

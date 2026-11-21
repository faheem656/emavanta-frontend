import Link from 'next/link';
export const metadata={description: 'Read the Emavanta privacy policy.', alternates: { canonical: '/legal/privacy' }, title:'Privacy Policy — Emavanta'};
export default function Privacy(){return <>
 <section className="hero2 container"><div className="badge">Legal</div><h1 style={{fontSize:46}}>Privacy Policy</h1>
  <p className="lead">Plain-language summary of how Emavanta handles data. Final wording should be reviewed by counsel before production launch.</p></section>
 <section className="section container prose">
  <div className="legal-note">This document is a product-level summary, not legal advice. Emavanta does not claim GDPR certification. The customer is the sender/controller of the messages they send.</div>
  <h2>Who is responsible</h2>
  <p>Emavanta UAB, Vilnius, Lithuania provides software tools. When you connect a sending account and send messages, you are the sender/controller. You are responsible for the content, recipient consent, legal basis and applicable rules in every jurisdiction you send to.</p>
  <h2>Data we process</h2>
  <ul>
   <li>Account details: name, work email, organization, hashed password, MFA settings.</li>
   <li>Workspace data: contacts you upload, templates, lists, campaigns, tasks, deals and notes.</li>
   <li>Message metadata: sender/recipient, subject, rendered content snapshot (90-day TTL), provider message ID and delivery events.</li>
   <li>Connected credentials: encrypted at rest; never written to logs or shown again.</li>
   <li>Billing: plan, usage counters and Stripe customer ID. We never store card numbers.</li>
  </ul>
  <h2>Why we process it</h2>
  <p>To provide the service, enforce plan limits, show analytics, prevent abuse, support you and meet accounting obligations. We do not sell personal data and we do not use your contacts to advertise to them.</p>
  <h2>Your controls</h2>
  <p>You can export your data from Settings → Data, delete contacts, disconnect accounts, revoke sessions and request workspace deletion. Suppression entries and audit records are retained for safety, consent evidence and billing disputes.</p>
  <h2>Sub-processors</h2>
  <p>Infrastructure, queue, email-delivery (only the provider you choose), payments (Stripe) and error reporting vendors are listed in the repository documentation. A final sub-processor list will be published before production launch.</p>
  <h2>Security</h2>
  <p>Argon2id passwords, authenticator-based 2FA, tenant-scoped queries, RBAC, encrypted credentials, hash-chained audit logs and automated tests. No system is perfectly secure; report issues to <a href="mailto:security@emavanta.com">security@emavanta.com</a>.</p>
  <h2>Contact</h2>
  <p>Privacy requests: <a href="mailto:privacy@emavanta.com">privacy@emavanta.com</a> or the <Link href="/contact">contact page</Link>.</p>
 </section>
</>;}

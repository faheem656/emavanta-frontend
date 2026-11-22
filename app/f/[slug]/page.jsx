import { notFound } from 'next/navigation';
import { cache } from 'react';
import HostedForm from './HostedForm';
import { resolveApiOrigin } from '../../../lib/api-origin.mjs';

export const dynamic = 'force-dynamic';

/**
 * Public hosted form page — the thing a customer embeds or links to.
 *
 * Rendered on the server so the page is complete on first paint (an embedded form inside
 * an iframe should never flash a spinner), and it talks to the API over the internal
 * origin, not through the dashboard session.
 */
const apiOrigin = resolveApiOrigin();

const load = cache(async slug => {
  try {
    const res = await fetch(`${apiOrigin}/api/v1/public/forms/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.status === 404) return { missing: true };
    if (!res.ok) return { error: true };
    return await res.json();
  } catch {
    return { error: true };
  }
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const form = await load(slug);
  return { title: form?.name ? `${form.name} — ${form.organizationName || 'Emavanta'}` : 'Form', robots: { index: false } };
}

export default async function HostedFormPage({ params }) {
  const { slug } = await params;
  const form = await load(slug);
  if (form?.missing) notFound();

  if (form?.error) {
    return <main className="hf-wrap">
      <div className="hf-card">
        <h1>This form is not available right now</h1>
        <p className="hf-sub">The form service did not answer. If you own this page, check that the Emavanta API is running, then reload.</p>
      </div>
    </main>;
  }

  return <main className="hf-wrap">
    <HostedForm form={form} />
    {!form.whiteLabel && <a className="hf-credit" href="/" rel="noopener">Powered by Emavanta</a>}
  </main>;
}

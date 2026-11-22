/**
 * Delete a template in a way that works on every server build, old or new:
 *
 *   1. DELETE /templates/:id            → { mode:'deleted' }   (current API)
 *   2. POST   /templates/:id/archive    → { mode:'archived' }  (alias, added for clients behind a stale proxy)
 *   3. PATCH  /templates/:id {archived} → { mode:'archived' }  (oldest API that still has templates)
 *
 * Only when all three fail do we throw, so the UI can put the row back and explain.
 * A template is never "half deleted": either it is gone, or it is archived and hidden.
 */
const archivedPatch = (patch, id) => patch(`/templates/${id}`, { status: 'archived' });

export async function removeTemplate({ id, del, patch, post }) {
  if (!id) throw new Error('That template has no id, so it cannot be deleted. Reload the page and try again.');

  try {
    await del(`/templates/${id}`);
    return { mode: 'deleted' };
  } catch (first) {
    // Fall through to the archive path for every failure mode we can recover from
    // (route missing on an older build, proxy hiccup, template already archived).
    if (post) {
      try { await post(`/templates/${id}/archive`, {}); return { mode: 'archived', reason: first?.message }; }
      catch { /* try the patch below */ }
    }
    try { await archivedPatch(patch, id); return { mode: 'archived', reason: first?.message }; }
    catch { throw first; }
  }
}

export const isArchived = template => template?.status === 'archived';
export const visibleTemplates = list => (Array.isArray(list) ? list : []).filter(t => !isArchived(t));

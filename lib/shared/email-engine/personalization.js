/** Safe, bounded personalization: tokens with fallbacks + simple conditionals. */
const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)(?:\|([^}]*))?\s*\}\}/g;
const CONDITIONAL = /\{\{#if\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

export const resolveToken = (name, ctx, fallback = '') => {
  const value = getPath(ctx, name) ?? getPath(ctx.customFields || {}, name) ?? getPath(ctx.sender || {}, name);
  if (value === undefined || value === null || value === '') return fallback;
  return escapeHtml(value);
};

export const renderText = (input, ctx) => {
  if (typeof input !== 'string') return '';
  let out = input.replace(CONDITIONAL, (_m, name, yes, no = '') => {
    const v = getPath(ctx, name) ?? getPath(ctx.customFields || {}, name);
    return v ? yes : no;
  });
  out = out.replace(TOKEN, (_m, name, fallback) => resolveToken(name, ctx, (fallback || '').trim()));
  return out;
};

export const extractTokens = input => {
  const found = new Set();
  for (const m of String(input || '').matchAll(TOKEN)) found.add(m[1]);
  return [...found];
};

export const DEFAULT_FALLBACKS = Object.freeze({
  first_name: 'there', firstName: 'there', company: 'your company',
  sender_name: 'the team', senderName: 'the team', email: ''
});

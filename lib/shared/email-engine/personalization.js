/** Safe, bounded personalization: tokens with fallbacks + simple conditionals. */
const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)(?:\|([^}]*))?\s*\}\}/g;
const CONDITIONAL = /\{\{#if\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

/**
 * `{{first_name}}` must find `firstName` — the API and our own docs advertise
 * snake_case tokens while contacts store camelCase, so a straight lookup made
 * every snake token fall back ("Hi there" instead of "Hi Ayesha").
 */
const snakeToCamel = s => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const camelToSnake = s => s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
const ALIASES = Object.freeze({
  firstname: 'firstName', fname: 'firstName',
  lastname: 'lastName', lname: 'lastName',
  fullname: 'firstName', companyname: 'company', organisation: 'company', organization: 'company',
  emailaddress: 'email', e_mail: 'email', mail: 'email',
  phonenumber: 'phone', mobile: 'phone', jobtitle: 'title', position: 'title', role: 'title'
});
/** Every name worth trying for one token, in order. */
const candidates = name => {
  const list = [name];
  const camel = snakeToCamel(name);
  if (camel !== name) list.push(camel);
  const snake = camelToSnake(name);
  if (snake !== name && !list.includes(snake)) list.push(snake);
  const alias = ALIASES[name] || ALIASES[camel];
  if (alias && !list.includes(alias)) list.push(alias);
  return list;
};
const present = v => v !== undefined && v !== null && v !== '';

/** ctx fields → customFields → sender; snake/camel aliases honoured everywhere. */
const lookup = (ctx, name) => {
  for (const source of [ctx, ctx?.customFields || {}, ctx?.sender || {}]) {
    for (const cand of candidates(name)) {
      const v = getPath(source, cand);
      if (present(v)) return v;
    }
  }
  return undefined;
};

// No default on `fallback`: `undefined` means "no pipe in the tag" and must
// reach the registry fallback below (a `= ''` default would swallow it).
export const resolveToken = (name, ctx, fallback, { html = true } = {}) => {
  const value = lookup(ctx, name);
  // Explicit pipe wins; otherwise the personalization registry's saved fallback.
  const fb = fallback !== undefined ? fallback : (ctx?.tokenFallbacks?.[name] ?? '');
  if (!present(value)) return html ? escapeHtml(fb) : String(fb);
  return html ? escapeHtml(value) : String(value);
};

export const renderText = (input, ctx, { html = true } = {}) => {
  if (typeof input !== 'string') return '';
  let out = input.replace(CONDITIONAL, (_m, name, yes, no = '') => (lookup(ctx, name) ? yes : no));
  out = out.replace(TOKEN, (_m, name, fallback) => resolveToken(
    name, ctx, fallback === undefined ? undefined : fallback.trim(), { html }));
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

import { escapeHtml } from './personalization.js';

// This module is imported by the visual editor in the browser too, so it must not
// pull in node:crypto. Web Crypto exists in Node 18+ and every modern browser.
const newId = () => (globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const FONT_STACK = "Arial,Helvetica,sans-serif";
const DEFAULT_STYLES = { background: '#f6f8fb', width: 640, fontFamily: FONT_STACK, padding: 24, radius: 10, subjectColor: '#172b4d' };

const px = v => (v === undefined || v === null || v === '' ? null : /^\d+(\.\d+)?$/.test(String(v)) ? `${Number(v)}px` : String(v));
const safeColor = v => (/^#[0-9a-f]{3,8}$/i.test(String(v)) || /^rgba?\(/i.test(String(v)) ? String(v) : null);

/** Inline styles every block understands (email clients ignore <style> blocks). */
const styleOf = (b = {}) => {
  const out = [];
  if (b.align) out.push(`text-align:${b.align}`);
  if (safeColor(b.color)) out.push(`color:${b.color}`);
  if (safeColor(b.background)) out.push(`background:${b.background}`);
  if (b.size) out.push(`font-size:${px(b.size)}`);
  if (b.weight) out.push(`font-weight:${b.weight}`);
  if (b.lineHeight) out.push(`line-height:${b.lineHeight}`);
  if (b.letterSpacing) out.push(`letter-spacing:${px(b.letterSpacing)}`);
  if (b.padding !== undefined && b.padding !== null) out.push(`padding:${Number(b.padding)}px`);
  if (b.radius !== undefined && b.radius !== null) out.push(`border-radius:${Number(b.radius)}px`);
  if (b.fontFamily) out.push(`font-family:${b.fontFamily}`);
  if (b.opacity !== undefined && b.opacity !== null) out.push(`opacity:${Number(b.opacity)}`);
  if (b.type !== 'divider' && b.borderWidth) out.push(`border:${Number(b.borderWidth)}px solid ${safeColor(b.borderColor) || '#e3eaf4'}`);
  return out.join(';');
};

const CSS = `style="font-family:Arial,Helvetica,sans-serif;color:#172b4d;line-height:1.5"`;
const withStyle = b => `style="font-family:${b.fontFamily || FONT_STACK};color:#172b4d;line-height:${b.lineHeight || 1.5}${styleOf(b) ? `;${styleOf(b)}` : ''}"`;

/**
 * Block content may contain a *small* amount of inline HTML — people paste
 * `<a href="…">our offer</a>` and expect a real link. Everything else is escaped:
 * no scripts, no iframes, no event handlers, no javascript: URLs, no url()/expression()
 * in inline CSS. {{tokens}} always survive.
 */
const ALLOWED_TAGS = new Set(['a', 'b', 'strong', 'i', 'em', 'u', 's', 'br', 'span', 'small', 'code']);
const SAFE_URL = /^(https?:|mailto:|tel:|\/|#|\{\{)/i;

const cleanAttrs = attrs => {
  const kept = [];
  const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (href) {
    const value = (href[2] ?? href[3] ?? '').trim();
    if (SAFE_URL.test(value)) kept.push(`href="${escapeHtml(value)}"`);
  }
  const style = attrs.match(/style\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (style) {
    const safe = (style[2] ?? style[3] ?? '').split(';')
      .map(d => d.trim())
      .filter(d => /^(color|background-color|font-weight|font-style|font-size|text-decoration|letter-spacing)\s*:/i.test(d))
      .filter(d => !/url\(|expression|javascript:/i.test(d))
      .join(';');
    if (safe) kept.push(`style="${escapeHtml(safe)}"`);
  }
  return kept.length ? ` ${kept.join(' ')}` : '';
};

export const sanitizeInline = html => String(html ?? '')
  .replace(/<\s*(script|iframe|object|embed|style|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  .replace(/<\s*(script|iframe|object|embed|style|form)\b[^>]*>/gi, '')
  .replace(/<\/?([a-z0-9-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi, (match, tag, attrs) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return escapeHtml(match);
    if (name === 'br') return '<br />';
    return `<${match.startsWith('</') ? '/' : ''}${name}${match.startsWith('</') ? '' : cleanAttrs(attrs)}>`;
  })
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

/** Content is sanitised, but {{tokens}} survive so personalization still works. */
const content = b => sanitizeInline(b.content);

const renderBlock = b => {
  const st = styleOf(b);
  switch (b.type) {
    case 'heading':
      return `<h1 style="font-family:${b.fontFamily || FONT_STACK};margin:0 0 12px;font-size:${px(b.size) || '24px'};` +
        `font-weight:${b.weight || 700};color:${safeColor(b.color) || '#172b4d'};line-height:${b.lineHeight || 1.25};` +
        `${b.align ? `text-align:${b.align};` : ''}${safeColor(b.background) ? `background:${b.background};` : ''}` +
        `${b.padding !== undefined ? `padding:${Number(b.padding)}px;` : ''}${b.radius !== undefined ? `border-radius:${Number(b.radius)}px;` : ''}` +
        `${b.letterSpacing ? `letter-spacing:${px(b.letterSpacing)};` : ''}">${content(b)}</h1>`;
    case 'text':
      return `<p style="font-family:${b.fontFamily || FONT_STACK};margin:0 0 14px;font-size:${px(b.size) || '15px'};` +
        `color:${safeColor(b.color) || '#334a67'};line-height:${b.lineHeight || 1.6};font-weight:${b.weight || 400};` +
        `${b.align ? `text-align:${b.align};` : ''}${safeColor(b.background) ? `background:${b.background};` : ''}` +
        `${b.padding !== undefined ? `padding:${Number(b.padding)}px;` : ''}${b.radius !== undefined ? `border-radius:${Number(b.radius)}px;` : ''}` +
        `${b.letterSpacing ? `letter-spacing:${px(b.letterSpacing)};` : ''}${b.opacity !== undefined ? `opacity:${b.opacity};` : ''}">${content(b)}</p>`;
    case 'link':
      return `<p style="margin:0 0 14px;font-family:${b.fontFamily || FONT_STACK};font-size:${px(b.size) || '15px'};` +
        `${b.align ? `text-align:${b.align};` : ''}"><a href="${escapeHtml(b.href || '#')}" ` +
        `style="color:${safeColor(b.color) || '#1f4e94'};text-decoration:${b.underline === false ? 'none' : 'underline'};` +
        `font-weight:${b.weight || 600}">${content(b)}</a></p>`;
    case 'button':
      return `<p style="margin:0 0 16px;${b.align ? `text-align:${b.align};` : ''}"><a href="${escapeHtml(b.href || '#')}" ` +
        `style="background:${safeColor(b.background) || '#1f4e94'};color:${safeColor(b.color) || '#ffffff'};` +
        `padding:${b.padding !== undefined ? `${Number(b.padding)}px ${Number(b.padding) + 8}px` : '11px 20px'};` +
        `border-radius:${b.radius !== undefined ? Number(b.radius) : 8}px;text-decoration:none;display:inline-block;` +
        `font-family:${b.fontFamily || FONT_STACK};font-size:${px(b.size) || '14px'};font-weight:${b.weight || 600}">${content(b)}</a></p>`;
    case 'card':
      return `<div style="background:${safeColor(b.background) || '#f5f8fd'};border:${Number(b.borderWidth || 1)}px solid ` +
        `${safeColor(b.borderColor) || '#e3eaf4'};border-radius:${b.radius !== undefined ? Number(b.radius) : 12}px;` +
        `padding:${b.padding !== undefined ? Number(b.padding) : 18}px;margin:0 0 16px;font-family:${b.fontFamily || FONT_STACK};` +
        `font-size:${px(b.size) || '15px'};color:${safeColor(b.color) || '#334a67'};line-height:${b.lineHeight || 1.6};` +
        `${b.align ? `text-align:${b.align};` : ''}">${content(b)}</div>`;
    case 'image': {
      const w = b.width ? `${Math.max(10, Math.min(100, Number(b.width)))}%` : '100%';
      // Never ship <img src=""> — clients show a broken-image glyph.
      if (!b.href) return `<div style="margin:0 0 16px;padding:28px;border:1px dashed #c8d6ea;border-radius:10px;` +
        `text-align:center;color:#7b8ca5;font-family:${b.fontFamily || FONT_STACK};font-size:12.5px">Image placeholder — add a URL in the editor</div>`;
      const img = `<img src="${escapeHtml(b.href || '')}" alt="${escapeHtml(b.alt || '')}" ` +
        `style="width:${w};max-width:100%;border-radius:${b.radius !== undefined ? Number(b.radius) : 10}px;display:block;` +
        `${b.align === 'center' ? 'margin:0 auto;' : b.align === 'right' ? 'margin-left:auto;' : ''}" />`;
      return `<div style="margin:0 0 16px;${b.align && b.align !== 'left' ? `text-align:${b.align};` : ''}">` +
        `${b.link ? `<a href="${escapeHtml(b.link)}">${img}</a>` : img}</div>`;
    }
    case 'divider':
      return `<hr style="border:0;border-top:${Number(b.borderWidth || 1)}px solid ${safeColor(b.borderColor) || '#e3eaf4'};` +
        `margin:${b.padding !== undefined ? Number(b.padding) : 18}px 0" />`;
    case 'spacer':
      return `<div style="height:${Number(b.height || 16)}px;line-height:${Number(b.height || 16)}px">&nbsp;</div>`;
    case 'columns': {
      const gap = Number(b.gap ?? 16);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>` +
        `${String(b.content || '').split('|||').map(c => `<td style="padding:0 ${gap / 2}px;vertical-align:top;` +
          `font-family:${b.fontFamily || FONT_STACK};font-size:${px(b.size) || '15px'};color:${safeColor(b.color) || '#334a67'};` +
          `line-height:${b.lineHeight || 1.6}">${escapeHtml(String(c).trim())}</td>`).join('')}</tr></table>`;
    }
    case 'unsubscribe':
      return `<p style="margin:18px 0 0;font-family:${b.fontFamily || FONT_STACK};font-size:${px(b.size) || '12px'};` +
        `${b.align ? `text-align:${b.align};` : ''}"><a href="${escapeHtml(b.href || '{{unsubscribe_url}}')}" ` +
        `style="color:${safeColor(b.color) || '#7b8ca5'}">${content(b) || 'Unsubscribe'}</a></p>`;
    case 'address':
      return `<p style="margin:8px 0 0;font-family:${b.fontFamily || FONT_STACK};font-size:${px(b.size) || '12px'};` +
        `color:${safeColor(b.color) || '#7b8ca5'};line-height:${b.lineHeight || 1.5};${b.align ? `text-align:${b.align};` : ''}">${content(b)}</p>`;
    case 'loop':
      return `<div data-loop="${escapeHtml(b.source || 'items')}">${content(b)}</div>`;
    case 'raw_html':
      return String(b.content || ''); // code blocks are sanitized at save time
    default:
      return `<div style="${st};font-family:${b.fontFamily || FONT_STACK}">${content(b)}</div>`;
  }
};

/**
 * Canonical model -> inline-styled HTML (email clients strip <style> tags).
 * The visual editor's preview calls this same function, so what you see on the
 * canvas is exactly what the recipient receives.
 */
export const blocksToHtml = (blocks, styles = {}) => {
  const s = { ...DEFAULT_STYLES, ...(styles || {}) };
  const width = Number(s.width) || DEFAULT_STYLES.width;
  const padding = Number.isFinite(Number(s.padding)) ? Number(s.padding) : DEFAULT_STYLES.padding;
  const radius = Number.isFinite(Number(s.radius)) ? Number(s.radius) : DEFAULT_STYLES.radius;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="margin:0;padding:24px;background:${safeColor(s.background) || DEFAULT_STYLES.background};` +
    `font-family:${s.fontFamily || FONT_STACK}"><div style="max-width:${width}px;margin:auto;background:#ffffff;` +
    `padding:${padding}px;border-radius:${radius}px;font-family:${s.fontFamily || FONT_STACK}">` +
    `${(blocks || []).map(renderBlock).join('\n')}</div></body></html>`;
};

export { renderBlock as renderEmailBlock, styleOf as emailBlockStyle, DEFAULT_STYLES as DEFAULT_EMAIL_STYLES };

/** Best-effort HTML -> blocks. Anything unparsed is preserved as raw_html. */
export const htmlToBlocks = html => {
  if (!html) return [];
  const blocks = [];
  const matches = [...html.matchAll(/<(h1|p|a|img|hr|div|table)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) {
      const raw = html.slice(cursor, m.index).trim();
      if (raw) blocks.push({ type: 'raw_html', content: raw });
    }
    const tag = m[1].toLowerCase();
    const inner = m[2].replace(/<[^>]+>/g, '').trim();
    blocks.push({ type: tag === 'h1' ? 'heading' : tag === 'img' ? 'image' : tag === 'hr' ? 'divider' : 'text', content: inner });
    cursor = m.index + m[0].length;
  }
  const tail = html.slice(cursor).trim();
  if (tail) blocks.push({ type: 'raw_html', content: tail });
  return blocks.length ? blocks : [{ type: 'raw_html', content: html }];
};

/** Blocks <-> code switch never loses content. */
export const switchMode = (template, mode) => {
  if (template.mode === mode) return template;
  return mode === 'code'
    ? { ...template, mode, html: template.html || blocksToHtml(template.blocks, template.styles) }
    : { ...template, mode, blocks: template.html ? htmlToBlocks(template.html) : template.blocks };
};

export const sanitizeHtml = html => String(html || '')
  .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
  .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
  .replace(/javascript:/gi, '')
  .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');

export const createTemplateVersion = template => ({ ...template, _id: template._id || newId(), version: (template.version || 0) + 1, updatedAt: new Date().toISOString() });

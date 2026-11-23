'use client';

const SAMPLE_TOKENS = { first_name: 'Dana', company: 'Northwind', sender_name: 'Emavanta team', city: 'Vilnius' };
const safeColor = (value, fallback) => /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(String(value || '')) ? value : fallback;
const safeSize = (value, fallback, min = 8, max = 22) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};
const previewText = value => String(value || '').replace(/\{\{\s*([\w.]+)(?:\|([^}]*))?\s*\}\}/g,
  (_, key, fallback) => SAMPLE_TOKENS[key] ?? fallback ?? '').replace(/\s+/g, ' ').trim();
const htmlText = value => String(value || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim();

function BlockPreview({ block }) {
  const content = previewText(block.content);
  const color = safeColor(block.color, '#344762');
  const background = safeColor(block.background, '#f1f5fb');
  switch (block.type) {
    case 'heading':
      return <div className="tpl-mini-heading" style={{ color, fontSize: safeSize(block.size, 15, 10, 22), textAlign: ['left', 'center', 'right'].includes(block.align) ? block.align : 'left' }}>{content}</div>;
    case 'text':
      return content ? <p className="tpl-mini-text" style={{ color, fontSize: safeSize(block.size, 9, 8, 13) }}>{content}</p> : null;
    case 'button':
      return <div className="tpl-mini-button-wrap" style={{ justifyContent: ['center', 'right'].includes(block.align) ? (block.align === 'center' ? 'center' : 'flex-end') : 'flex-start' }}>
        <span className="tpl-mini-button" style={{ background: safeColor(block.background, '#3158c9'), color: safeColor(block.color, '#fff') }}>{content || 'Open'}</span>
      </div>;
    case 'link':
      return content ? <p className="tpl-mini-link">{content}</p> : null;
    case 'card':
      return <div className="tpl-mini-card" style={{ color, background }}>{content}</div>;
    case 'columns': {
      const columns = String(block.content || '').split('|||').map(previewText).filter(Boolean).slice(0, 2);
      return columns.length ? <div className="tpl-mini-columns">{columns.map((text, index) => <span key={index}>{text}</span>)}</div> : null;
    }
    case 'image':
      return <div className="tpl-mini-image"><span aria-hidden="true">▧</span>{previewText(block.alt) || 'Image block'}</div>;
    case 'divider':
      return <hr className="tpl-mini-divider" />;
    case 'spacer':
      return <div className="tpl-mini-spacer" />;
    case 'address':
    case 'unsubscribe':
      return content ? <p className="tpl-mini-footer">{content}</p> : null;
    case 'raw_html': {
      const text = previewText(htmlText(block.content));
      return <div className="tpl-mini-html"><span>HTML CONTENT</span><p>{text || 'Custom email markup'}</p></div>;
    }
    default:
      return content ? <p className="tpl-mini-text">{content}</p> : null;
  }
}

export default function TemplateCardPreview({ template }) {
  const blocks = Array.isArray(template?.blocks) ? template.blocks : [];
  const previewBlocks = blocks.slice(0, 5);
  const htmlFallback = !previewBlocks.length && template?.html ? htmlText(template.html) : '';
  const styles = template?.styles || {};
  const emailBackground = safeColor(styles.background, '#f4f7fb');
  const subject = previewText(template?.subject) || 'Your subject line';
  return <div className="tpl-mini-preview" aria-label={`Email preview: ${template?.name || 'Template'}`}>
    <div className="tpl-mini-email" style={{ background: emailBackground }}>
      <div className="tpl-mini-mailbar"><span /><span /><span /> <b>EMAIL PREVIEW</b></div>
      <div className="tpl-mini-subject">{subject}</div>
      <div className="tpl-mini-body">
        {previewBlocks.length
          ? previewBlocks.map((block, index) => <BlockPreview key={`${block.type || 'block'}-${index}`} block={block} />)
          : <div className="tpl-mini-html"><span>{template?.mode === 'code' ? 'HTML CONTENT' : 'EMAIL CONTENT'}</span><p>{previewText(htmlFallback) || 'Add content in the template editor to see your preview.'}</p></div>}
        {blocks.length > previewBlocks.length && <span className="tpl-mini-more">+{blocks.length - previewBlocks.length} more blocks</span>}
      </div>
    </div>
  </div>;
}

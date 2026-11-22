'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/**
 * Right-hand sliding panel used for payments and other focused tasks.
 * Same rules as Modal — portalled to <body>, Esc closes, the page behind stops
 * scrolling — but it slides in from the edge so the page stays visible next to it.
 */
export default function SlideOver({ title, subtitle, onClose, children, footer, width = 480, label }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // next frame so the slide transition actually plays
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const panel = <div className={`slide-backdrop ${shown ? 'in' : ''}`} onMouseDown={onClose}>
    <aside className={`slide-panel ${shown ? 'in' : ''}`} style={{ width: `min(${width}px, 100vw)` }}
      role="dialog" aria-modal="true" aria-label={title || label} onMouseDown={e => e.stopPropagation()}>
      <header className="slide-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
      </header>
      <div className="slide-body">{children}</div>
      {footer && <footer className="slide-foot">{footer}</footer>}
    </aside>
  </div>;

  return mounted ? createPortal(panel, document.body) : null;
}

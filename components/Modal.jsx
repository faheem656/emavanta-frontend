'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/**
 * Dialog shell. It is portalled to <body> so a transformed/animated ancestor card can
 * never clip it or paint over it, the body scrolls inside one panel, and the actions
 * stay pinned to the bottom of the dialog no matter how long the content is.
 */
export default function Modal({ title, onClose, children, footer }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Esc closes, and the page behind must not scroll while a dialog is open
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const dialog = <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal card" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
      <div className="topbar"><h2 style={{ margin: 0 }}>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer row">{footer}</div>}
    </div>
  </div>;

  return mounted ? createPortal(dialog, document.body) : null;
}

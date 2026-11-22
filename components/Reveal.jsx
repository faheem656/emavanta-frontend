'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal wrapper. Content is visible by default (no JS, reduced motion, or a
 * crawler) and only animates in when it is actually approaching the viewport.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { setShown(true); io.disconnect(); }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`}
    style={{ transitionDelay: delay ? `${delay}ms` : undefined }}>{children}</Tag>;
}

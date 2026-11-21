'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/** Full-screen workspace dialog with scroll lock, keyboard focus and return focus. */
export default function FullPageDialog({ title, eyebrow, description, onClose, children }) {
 const [mounted,setMounted]=useState(false), panel=useRef(null), closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{setMounted(true);},[]);
 useEffect(()=>{
  if(!mounted)return undefined;
  const previous=document.activeElement, oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const node=panel.current;node?.focus();
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();closeRef.current?.();return;}
   if(e.key!=='Tab'||!node)return;
   const focusable=[...node.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
   if(!focusable.length){e.preventDefault();node.focus();return;}
   const first=focusable[0],last=focusable.at(-1);
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===node)){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return ()=>{document.removeEventListener('keydown',key);document.body.style.overflow=oldOverflow;previous?.focus?.();};
 },[mounted]);
 if(!mounted)return null;
 return createPortal(<div className="fp-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-dialog-title" ref={panel} tabIndex={-1}>
  <header className="fp-top"><div className="fp-brand"><span><Icon name="bolt" size={17}/></span> EMAVANTA <i>/</i> CONTACTS</div>
   <button type="button" className="fp-close" onClick={onClose} aria-label="Close dialog"><Icon name="close" size={17}/> <span>Close</span></button></header>
  <div className="fp-scroll"><main className="fp-content"><div className="fp-intro"><div className="fp-kicker"><span/> {eyebrow}</div><h1 id="fp-dialog-title">{title}</h1><p>{description}</p></div>{children}</main></div>
 </div>,document.body);
}

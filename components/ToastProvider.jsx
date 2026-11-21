'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import Icon from './Icon';

const Ctx = createContext(()=>{});
export const useToast = () => useContext(Ctx);

/**
 * Usage:
 *   toast('Saved')                                   → green toast
 *   toast('Nope','error')                            → red toast
 *   toast({ title:'Seat limit reached', message:'…', level:'warn',
 *           actions:[{ label:'Buy seats', href:'/dashboard/billing' }] })
 */
export default function ToastProvider({children}){
  const [items,setItems] = useState([]);
  const dismiss = useCallback(id => setItems(x=>x.filter(i=>i.id!==id)),[]);
  const push = useCallback((input,level='ok')=>{
    const payload = typeof input === 'string' ? { message:input, level } : { level, ...input };
    const id = Math.random().toString(36).slice(2);
    setItems(x=>[...x.slice(-4),{ id, level:'ok', actions:[], ...payload }]);
    setTimeout(()=>setItems(x=>x.filter(i=>i.id!==id)), payload.timeout || (payload.actions?.length ? 9000 : 4200));
  },[]);
  return <Ctx.Provider value={push}>{children}
    <div className="toast-wrap" role="status" aria-live="polite">{items.map(i=>
      <div className={`toast tone-${i.level}`} key={i.id}>
        <span className="toast-icon"><Icon name={i.level==='error'?'close':i.level==='warn'?'bolt':'check'} size={14}/></span>
        <div className="toast-body">
          {i.title && <b>{i.title}</b>}
          <span>{i.message}</span>
          {!!i.actions?.length && <div className="toast-actions">
            {i.actions.map(a => a.href
              ? <Link key={a.label} href={a.href} className="toast-action" onClick={()=>dismiss(i.id)}>{a.label}<Icon name="chevron" size={12}/></Link>
              : <button key={a.label} className="toast-action" onClick={()=>{a.onClick?.();dismiss(i.id);}}>{a.label}</button>)}
          </div>}
        </div>
        <button className="toast-close" onClick={()=>dismiss(i.id)} aria-label="Dismiss"><Icon name="close" size={12}/></button>
      </div>)}
    </div>
  </Ctx.Provider>;
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { get, del, patch, post } from '../../../lib/api';
import { removeTemplate, visibleTemplates } from '../../../lib/templateDelete';
import PageHead from '../../../components/PageHead';
import TemplateBuilder from '../../../components/TemplateBuilder';
import TemplateCardPreview from '../../../components/TemplateCardPreview';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { notify } from '../../../lib/notify';
import { CardGridSkeleton } from '../../../components/DashboardSkeleton';

const arr = v => Array.isArray(v) ? v : (v?.items || []);
export default function Templates(){
 const toast = useToast();
 const [items,setItems] = useState([]), [selected,setSelected] = useState(null);
 const [editing,setEditing] = useState(false), [loading,setLoading] = useState(true);
 const [query,setQuery] = useState(''), [filter,setFilter] = useState('all');
 const load = () => get('/templates').then(r => {
  const rows = visibleTemplates(arr(r)); setItems(rows);
  setSelected(prev => prev ? rows.find(x => x._id === prev._id) || prev : null);
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) { const match = rows.find(x => x._id === id); if (match) { setSelected(match); setEditing(true); } window.history.replaceState(null, '', '/dashboard/templates'); }
 }).catch(e => notify(toast,e)).finally(()=>setLoading(false));
 useEffect(()=>{ load(); },[]);
 const shown = useMemo(()=>items.filter(t => (filter==='all'||(t.mode||'blocks')===filter) && `${t.name||''} ${t.subject||''}`.toLowerCase().includes(query.trim().toLowerCase())),[items,filter,query]);
 const remove = async t => {
  if(!window.confirm(`Delete “${t.name}”? Campaigns and automations that reference it may stop working. This cannot be undone.`)) return;
  try { const r=await removeTemplate({id:t._id,del,patch,post}); toast(r.mode==='archived'?'Template archived':'Template deleted'); await load(); }
  catch(e){notify(toast,e);}
 };
 const duplicate=async t=>{ try { const copy=await post(`/templates/${t._id}/duplicate`,{}); toast('Copy created'); await load(); setSelected(copy); setEditing(true); } catch(e){notify(toast,e);} };
 const openNew=()=>{setSelected(null);setEditing(true);};
 if(editing) return <>
  <PageHead title={selected ? 'Edit template' : 'Create template'} subtitle="One shared editor for your library, campaigns and workflows." actions={<button className="btn secondary sm" onClick={()=>{setEditing(false);setSelected(null);load();}}>Back to library</button>}/>
  <div className="card luxe-card tpl-pane"><TemplateBuilder key={selected?._id||'new'} initial={selected} onSaved={saved=>{setItems(prev=>[saved,...prev.filter(x=>x._id!==saved._id)]);}} onBack={()=>{setSelected(null);setEditing(false);load();}}/></div>
 </>;
 return <>
  <PageHead title="Templates" subtitle="Create, organize and reuse emails across your workspace." actions={<button className="btn sm" onClick={openNew}><Icon name="plus" size={15}/> New template</button>}/>
  <section className="template-hub-hero"><div><span className="template-eyebrow">YOUR CREATIVE WORKSPACE</span><h2>Great emails start here.</h2><p>Build a reusable design once, then bring it into a campaign or workflow. Preview on desktop and mobile before saving.</p><button className="btn" onClick={openNew}><Icon name="plus" size={15}/> Create an email</button></div><div className="template-hero-art" aria-hidden="true"><span>✦</span><div><i></i><i></i><i></i><b>YOUR MESSAGE</b></div></div></section>
  <div className="template-library-heading"><div><h2>Your library <span className="badge">{items.length}</span></h2><p className="muted">Saved designs, ready when you need them.</p></div><input className="topbar-input" aria-label="Search templates" placeholder="Search name or subject…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
  <div className="segmented template-filters">{[['all','All'],['blocks','Visual'],['code','HTML']].map(([v,l])=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{l}</button>)}</div>
  {loading ? <CardGridSkeleton count={6} columns={3} /> : shown.length ? <div className="template-card-grid">{shown.map(t=><article className="template-library-card" key={t._id}>
   <div className="template-card-art"><TemplateCardPreview template={t}/><span className="badge">{t.mode==='code'?'HTML':'Visual'}</span></div>
   <div className="template-card-content"><h3>{t.name}</h3><p>{t.subject || 'No subject'}</p><div className="template-card-meta">{Array.isArray(t.blocks) ? `${t.blocks.length} content blocks` : 'Reusable email'} · Version {t.version||1}{t.updatedAt && <> · Updated {new Date(t.updatedAt).toLocaleDateString()}</>}</div>
   <div className="template-card-actions"><button className="btn secondary sm" onClick={()=>{setSelected(t);setEditing(true);}}>Edit template</button><button className="icon-btn sm" title="Duplicate template" aria-label={`Duplicate ${t.name}`} onClick={()=>duplicate(t)}><Icon name="copy" size={14}/></button><button className="icon-btn sm danger-text" title="Delete template" aria-label={`Delete ${t.name}`} onClick={()=>remove(t)}><Icon name="close" size={14}/></button></div></div>
  </article>)}</div> : <div className="card luxe-card empty template-empty"><h3>{items.length ? 'No templates match your search' : 'Your library is ready'}</h3><p className="muted">{items.length ? 'Try another name, subject or filter.' : 'Create your first reusable email in the visual editor or HTML.'}</p>{!items.length && <button className="btn sm" onClick={openNew}>Create a template</button>}</div>}
 </>;
}

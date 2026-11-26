'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { get } from '../../../../lib/api';
import PageHead from '../../../../components/PageHead';
import TemplateBuilder from '../../../../components/TemplateBuilder';
import DashboardSkeleton from '../../../../components/DashboardSkeleton';

/** Dedicated edit page — one template, one URL, refresh-safe. */
export default function EditTemplate(){
 const { id } = useParams();
 const router = useRouter();
 const [tpl,setTpl] = useState(null);
 const [loaded,setLoaded] = useState(false);
 useEffect(()=>{
  if (!id) return;
  get(`/templates/${encodeURIComponent(id)}`).then(r=>{ if (r && !Array.isArray(r)) setTpl(r); })
   .catch(()=>{}).finally(()=>setLoaded(true));
 },[id]);
 if (!loaded) return <DashboardSkeleton variant="overview" />;
 if (!tpl) return <>
  <PageHead title="Template not found" subtitle="It may have been deleted."
   actions={<button className="btn secondary sm" onClick={()=>router.push('/dashboard/templates')}>Back to library</button>}/>
  <div className="card empty">This template no longer exists.</div>
 </>;
 return <>
  <PageHead title="Edit template" subtitle="One shared editor for your library, campaigns and workflows."
   actions={<button className="btn secondary sm" onClick={()=>router.push('/dashboard/templates')}>Back to library</button>}/>
  <div className="card luxe-card tpl-pane">
   <TemplateBuilder key={id} initial={tpl}
    onSaved={saved=>setTpl(prev=>prev ? { ...prev, ...saved } : saved)}
    onBack={()=>router.push('/dashboard/templates')} />
  </div>
 </>;
}

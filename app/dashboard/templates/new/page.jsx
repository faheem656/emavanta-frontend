'use client';
import { useRouter } from 'next/navigation';
import PageHead from '../../../../components/PageHead';
import TemplateBuilder from '../../../../components/TemplateBuilder';

/** Dedicated create page — the library stays a library. */
export default function NewTemplate(){
 const router = useRouter();
 return <>
  <PageHead title="Create template" subtitle="One shared editor for your library, campaigns and workflows."
   actions={<button className="btn secondary sm" onClick={()=>router.push('/dashboard/templates')}>Back to library</button>}/>
  <div className="card luxe-card tpl-pane">
   <TemplateBuilder key="new" initial={null}
    onSaved={saved=>{
      // First save gives the template an id — put it in the URL WITHOUT a
      // route change so the editor keeps the user's in-flight typing.
      if (saved?._id) window.history.replaceState(null, '', `/dashboard/templates/${saved._id}`);
    }}
    onBack={()=>router.push('/dashboard/templates')} />
  </div>
 </>;
}

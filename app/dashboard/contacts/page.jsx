'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { get, post, patch, del } from '../../../lib/api';
import PageHead from '../../../components/PageHead';
import Modal from '../../../components/Modal';
import FullPageDialog from '../../../components/FullPageDialog';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';
import { parseCSV, guessMapping, buildContacts } from '../../../lib/csv';
import { notify } from '../../../lib/notify';

const arr = v => Array.isArray(v) ? v : (v?.items || []);

// Bounce history beats any older "valid" verdict — a bounced contact is
// INVALID for sending, so the badge must never claim otherwise (stale rows
// self-heal on the next verification run).
const effVerification = c => {
 const v = c.verification;
 if (!v?.status) return null;
 if ((c.status === 'bounced' || c.status === 'complained') && v.status !== 'INVALID')
  return { ...v, status:'INVALID', reason:'bounced' };
 return v;
};

export default function Contacts(){
 const toast = useToast();
 const [items,setItems] = useState([]);
 const [lists,setLists] = useState([]);
 const [search,setSearch] = useState('');
 const [listFilter,setListFilter] = useState('');
 const [email,setEmail] = useState('');
 const [name,setName] = useState('');
 const [company,setCompany] = useState('');
 const [newList,setNewList] = useState('');
 const [renameId,setRenameId] = useState('');
 const [renameValue,setRenameValue] = useState('');
 const [bulk,setBulk] = useState('');
 const [bulkOpen,setBulkOpen] = useState(false);
 const [pasteListId,setPasteListId]=useState(''),[pasteBusy,setPasteBusy]=useState(false);
 const [csvOpen,setCsvOpen] = useState(false);
 const [csvRows,setCsvRows] = useState([]);
 const [csvName,setCsvName] = useState('');
 const [mapping,setMapping] = useState({});
 const [customTokens,setCustomTokens] = useState([]);
 const [personalizeOpen,setPersonalizeOpen] = useState(false);
 const [newToken,setNewToken] = useState({ token:'', label:'', fallback:'' });
 const [tokenBusy,setTokenBusy] = useState(false);
 const [step,setStep] = useState('upload');
 const [importing,setImporting] = useState(false);
 const fileRef = useRef(null), loadEpoch=useRef(0);
 const [editContact,setEditContact] = useState(null);
 const [editLists,setEditLists] = useState([]);
 const [contactsLoading,setContactsLoading] = useState(true);
 const [page,setPage] = useState(0),[total,setTotal]=useState(0),[selected,setSelected]=useState([]),[targetList,setTargetList]=useState(''),[actionBusy,setActionBusy]=useState(false);
 const [verifFilter,setVerifFilter]=useState('');   // '' | UNVERIFIED | status
 const [vStats,setVStats]=useState(null);          // GET /contacts/verification-stats
 const [verifyBusy,setVerifyBusy]=useState(false);

 const loadStats = () => get('/contacts/verification-stats').then(r=>setVStats(r)).catch(()=>{});

 const load = async () => {
  const epoch=++loadEpoch.current;
  try {
   const query = new URLSearchParams({limit:'100',skip:String(page*100),...(search ? {search}:{}),...(listFilter ? {listId:listFilter}:{}),
     ...(verifFilter ? {verification:verifFilter}:{})});
   const [c,l] = await Promise.all([get(`/contacts?${query}`), get('/contacts/lists')]);
   if(epoch !== loadEpoch.current)return;
   setItems(arr(c)); setTotal(c.total ?? arr(c).length); setLists(arr(l));
   loadStats();
  } catch(e) { if(epoch===loadEpoch.current)notify(toast, e); } finally { if(epoch===loadEpoch.current)setContactsLoading(false); }
 };
 useEffect(() => { ++loadEpoch.current; setContactsLoading(true); setItems([]); setSelected([]); const timer=setTimeout(load,250); return ()=>clearTimeout(timer); }, [search,listFilter,verifFilter,page]);
 useEffect(() => { setSelected([]); }, [search,listFilter,verifFilter,page]);

 const loadTokens = () => get('/personalization/tokens').then(r => setCustomTokens(arr(r.custom || []))).catch(()=>{});
 useEffect(() => { loadTokens(); loadStats(); if (new URLSearchParams(location.search).get('personalize')) setPersonalizeOpen(true); }, []);

 // Verify selected (or a single row) — PENDING + queue; fresh duplicates come
 // back skipped (free), credits are only spent on real work.
 const verifyContacts = async (ids) => {
  if(!ids.length || verifyBusy)return;
  setVerifyBusy(true);
  try {
   const r = await post('/contacts/verify', { contactIds: ids });
   toast({ title:`${r.queued} address(es) queued for verification`,
     message:`${r.skippedFresh||0} already fresh (free) · ${r.note||'Results appear within seconds — refresh shortly.'}` });
   setSelected([]); await load(); loadStats();
  } catch(e){ notify(toast,e); } finally { setVerifyBusy(false); }
 };

 const createList = async () => {
  if (newList.trim().length < 2) { toast('List name must be at least 2 characters','warn'); return; }
  try { await post('/contacts/lists',{name:newList.trim()}); setNewList(''); toast('List created'); load(); }
  catch(e){ notify(toast, e); }
 };
 const saveRename = async id => {
  if (renameValue.trim().length < 2) { setRenameId(''); return; }
  try { await patch(`/contacts/lists/${id}`,{name:renameValue.trim()}); setRenameId(''); toast('List renamed'); load(); }
  catch(e){ notify(toast, e); }
 };
 const removeList = async l => {
  if (!window.confirm(`Delete list “${l.name}”? Contacts stay in your workspace.`)) return;
  try { await del(`/contacts/lists/${l._id}`); if(listFilter===l._id)setListFilter(''); toast('List removed'); load(); }
  catch(e){ notify(toast, e); }
 };
 const addContact = async () => {
  if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Enter a valid email','warn'); return; }
  try { const r=await post('/contacts',{email:email.toLowerCase().trim(),firstName:name||email.split('@')[0],company,
    listIds:listFilter?[listFilter]:[]}); setEmail('');setName('');setCompany('');toast(r.existing ? 'Existing contact kept; selected list added if needed' : 'Contact added');load(); }
  catch(e){ notify(toast, e); }
 };
 const readCsv = file => {
  if (file.size > 5 * 1024 * 1024) { toast('CSV is larger than 5 MB','error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
   const rows = parseCSV(String(e.target.result || ''));
   setCsvRows(rows); setCsvName(file.name); setStep(rows.length ? 'map' : 'upload');
   setMapping(guessMapping(rows.columns || ['email','name','company']));
   if (!rows.length) toast('No valid emails found in that file','warn');
   else {
     const custom = Object.values(guessMapping(rows.columns||[])).filter(v=>v==='custom').length;
     toast({ title:`${rows.length} contacts read`, message:custom?`${custom} extra column(s) found — we mapped them as personalization fields. You can change any of them.`:'Everything mapped automatically — confirm to finish.' });
   }
  };
  reader.onerror = () => toast('Could not read that file','error');
  reader.readAsText(file);
 };
 const uploadCsv = async () => {
  setImporting(true);
  const contacts = buildContacts(csvRows, mapping);
  // Register any custom columns as real personalization tokens so {{tokens}} work in templates.
  const customKeys = [...new Set(Object.values(mapping).filter(v => v === 'custom'))];
  for (const column of Object.keys(mapping).filter(c => mapping[c] === 'custom')) {
   const token = column.replace(/[^a-zA-Z0-9_.]/g, '_').toLowerCase();
   if (!customTokens.some(t => t.token === token)) {
    try { await post('/personalization/tokens',{ token, label:column, source:'contact.customFields', fallback:'' }); }
    catch { /* already registered — safe to continue */ }
   }
  }
  try {
   const r = await post('/contacts/import',{ contacts, listIds:listFilter?[listFilter]:[], immediate:true });
   toast({ title:r.job==='queued'?'Import queued':'Import finished', message:r.job==='queued'?'Large import queued for processing. Refresh contacts after the worker completes.':`${r.created||0} new · ${r.addedToLists||0} existing contacts added to lists · ${r.invalid||0} invalid. No duplicate contacts were created.` + (customKeys.length?` ${customKeys.length} column(s) became personalization tokens.`:'' ) });
   setCsvRows([]); setCsvName(''); setMapping({}); setStep('upload'); setCsvOpen(false); load(); loadTokens();
  } catch(e){ notify(toast, e); }
  finally{ setImporting(false); }
 };
 const importBulk = async () => {
  if(pasteBusy)return;
  const rows = bulk.split('\n').map(s=>s.trim()).filter(s=>/^\S+@\S+\.\S+$/.test(s))
    .map(e=>({email:e.toLowerCase(),listIds:pasteListId?[pasteListId]:[]}));
  if (!rows.length) { toast('Paste at least one valid email','warn'); return; }
  setPasteBusy(true);
  try { const r=await post('/contacts/import',{contacts:rows,listIds:pasteListId?[pasteListId]:[],immediate:true});
   toast(r.job==='queued'?'Import queued; refresh when processing completes.':`${r.created||0} new · ${r.addedToLists||0} existing contacts added to lists`); setBulk('');setBulkOpen(false);load(); }
  catch(e){ notify(toast, e); } finally {setPasteBusy(false);}
 };
 const openEditor = c => { setEditContact(c); setEditLists(c.listIds||[]); };
 const saveEditor = async () => {
  try { await post(`/contacts/${editContact._id}/lists`,{listIds:editLists}); setEditContact(null); toast('Categories updated'); load(); }
  catch(e){ notify(toast, e); }
 };
 const toggleEdit = id => setEditLists(v => v.includes(id) ? v.filter(x=>x!==id) : [...v,id]);

 const visible = items;
 const toggleSelected = id => setSelected(v => v.includes(id) ? v.filter(x=>x!==id) : [...v,id]);
 const doBulk = async (action, ids=selected) => {
  if(!ids.length || actionBusy)return;
  if(action==='add_to_list' && !targetList){toast('Choose a destination list','warn');return;}
  if(action==='delete' && !window.confirm(`Delete ${ids.length} contact(s) from the workspace and all lists? Re-importing the same email will restore the contact.`))return;
  setActionBusy(true);
  try {const r=await post('/contacts/bulk-action',{action,ids,...(action==='add_to_list'?{listId:targetList}:{})});toast(action==='delete'?`${r.matched} contact(s) deleted`:`${r.matched} contact(s) added to the list`);setSelected([]);await load();}
  catch(e){notify(toast,e);}finally{setActionBusy(false);}
 };
 const listName = id => lists.find(l=>l._id===id)?.name || id;

 return <>
  <PageHead title="Contacts" subtitle="Lists, categories, dedupe and streaming CSV import"
   actions={<div className="row"><input placeholder="Search contacts…" value={search} onChange={e=>{setPage(0);setSearch(e.target.value);}}/>
    <button className="btn secondary sm" onClick={()=>{setCsvOpen(true);setStep('upload');}}><Icon name="download" size={15}/> Upload CSV</button>
    <button className="btn ghost sm" onClick={()=>setPersonalizeOpen(true)}><Icon name="mail" size={15}/> Personalization</button>
    <button className="btn ghost sm" onClick={()=>{setPasteListId(listFilter);setBulkOpen(true);}}>Paste emails</button>
    <Link className="btn ghost sm" href="/dashboard/verification"><Icon name="check" size={15}/> Verify</Link></div>}/>

  {csvOpen && <div className="card luxe-card csv-panel">
   <div className="mini-row"><div><h2 style={{margin:0}}>Import contacts from a file</h2>
    <p className="muted">{step==='map'?'Step 2 · confirm column mapping and personalization':'Step 1 · upload a CSV or Excel export (UTF-8, max 5 MB)'}
     {listFilter?` · saved to ${listName(listFilter)}`:' · saved uncategorised'}</p></div>
    <button className="btn ghost sm" onClick={()=>{setCsvOpen(false);setCsvRows([]);setCsvName('');setStep('upload');}}><Icon name="close" size={14}/></button></div>
   <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" style={{display:'none'}}
    onChange={e=>{const f=e.target.files?.[0];if(f)readCsv(f);e.target.value='';}}/>

   {step==='upload' && <div className="csv-drop" onClick={()=>fileRef.current?.click()}
    onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('over');}}
    onDragLeave={e=>e.currentTarget.classList.remove('over')}
    onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('over');const f=e.dataTransfer.files?.[0];if(f)readCsv(f);}}>
    <Icon name="download" size={26}/><b>Choose a CSV file or drop it here</b>
    <span className="muted">Any column names work — we detect email, name and company for you</span>
   </div>}

   {step==='map' && <>
    <div className="map-head">
     <div><b>{csvName}</b><span className="muted"> · {csvRows.length} rows detected</span></div>
     <button className="btn ghost sm" onClick={()=>{setStep('upload');setCsvRows([]);}}>Choose another file</button>
    </div>
    <div className="map-grid">
     {(csvRows.columns||[]).map(col => {
      const target = mapping[col] || 'ignore';
      const sample = csvRows.find(r => r.__raw?.[col])?.__raw?.[col] || '—';
      return <div className={`map-row ${target==='custom'?'is-custom':''}`} key={col}>
       <div className="map-source"><b>{col}</b><span className="muted">e.g. {String(sample).slice(0,32)}</span></div>
       <Icon name="chevron" size={14}/>
       <select value={target} onChange={e=>setMapping({...mapping,[col]:e.target.value})}>
        <option value="email">Email address</option>
        <option value="firstName">First name</option>
        <option value="lastName">Last name</option>
        <option value="company">Company</option>
        <option value="phone">Phone</option>
        <option value="city">City</option>
        <option value="country">Country</option>
        <option value="title">Job title</option>
        <option value="custom">Personalization token</option>
        <option value="ignore">Don’t import</option>
       </select>
       {target==='custom' && <span className="badge ok">{'{{'+col.replace(/[^a-zA-Z0-9_.]/g,'_').toLowerCase()+'}}'}</span>}
      </div>;
     })}
    </div>
    <div className="notice ok" style={{marginTop:12}}>
     <b>Personalization is set up automatically.</b> Extra columns become tokens you can drop into any email —
     {' '}<code>{'{{city}}'}</code>, <code>{'{{phone}}'}</code> — each with a safe fallback. Change any mapping above before saving.
    </div>
    <div className="table-card" style={{marginTop:12}}><table><thead><tr><th>Email</th><th>Name</th><th>Company</th><th>Personalization</th></tr></thead><tbody>
     {buildContacts(csvRows, mapping).slice(0,4).map((r,i)=><tr key={i}><td>{r.email}</td><td>{r.firstName||'—'}</td><td>{r.company||'—'}</td>
      <td className="muted" style={{fontSize:11}}>{Object.entries(r.customFields||{}).map(([k,v])=>`${k}: ${v}`).join(' · ')||'—'}</td></tr>)}
    </tbody></table></div>
    <div className="row" style={{justifyContent:'space-between',marginTop:12}}>
     <span className="muted">Preview shows the first 4 of {buildContacts(csvRows, mapping).length} valid contacts</span>
     <div className="row">
      <button className="btn ghost sm" onClick={()=>{setStep('upload');setCsvRows([]);}}>Back</button>
      <button className="btn sm" disabled={importing||!buildContacts(csvRows,mapping).length} onClick={uploadCsv}>
       {importing?'Saving…':`Confirm & save ${buildContacts(csvRows,mapping).length} contacts`}</button>
     </div>
    </div>
   </>}
  </div>}

  {bulkOpen && <FullPageDialog title="Paste email addresses" eyebrow="QUICK IMPORT" description="Bring your audience together in a few seconds. One email per line — existing contacts are safely added to your chosen list." onClose={()=>{if(!pasteBusy)setBulkOpen(false);}}>
   <div className="fp-grid"><section className="fp-card"><div className="fp-card-head"><div className="fp-icon"><Icon name="mail" size={20}/></div><div><h2>Your contacts</h2><p>Paste your email addresses below</p></div></div>
    <label htmlFor="paste-emails">Email addresses</label><textarea id="paste-emails" rows={12} placeholder={'one@example.com\ntwo@example.com'} value={bulk} onChange={e=>setBulk(e.target.value)} disabled={pasteBusy}/>
    <div className="fp-help">{bulk.split('\n').map(x=>x.trim()).filter(x=>/^\S+@\S+\.\S+$/.test(x)).length} valid lines · invalid lines are skipped</div>
    <label htmlFor="paste-list">Add to list</label><select id="paste-list" value={pasteListId} onChange={e=>setPasteListId(e.target.value)} disabled={pasteBusy}><option value="">No list · uncategorised</option>{lists.map(l=><option key={l._id} value={l._id}>{l.name}</option>)}</select>
    <div className="fp-actions"><button className="btn secondary" disabled={pasteBusy} onClick={()=>setBulkOpen(false)}>Cancel</button><button className="btn" disabled={pasteBusy||!bulk.trim()} onClick={importBulk}><Icon name="plus" size={15}/>{pasteBusy?'Importing…':'Import contacts'}</button></div>
   </section><aside className="fp-side"><div className="fp-side-icon">✦</div><h3>Good contacts.
No duplicates.</h3><p>Already in your workspace? We’ll reuse the contact and add it to the selected list instead of creating another record.</p><div className="fp-side-rule"/><span>ONE CONTACT · MULTIPLE LISTS</span></aside></div>
  </FullPageDialog>}

  <div className="contacts-layout">
   <div className="card luxe-card lists-panel">
    <div className="mini-row"><h2 style={{margin:0}}>Lists</h2><span className="badge">{lists.length}</span></div>
    <button className={`list-item ${!listFilter?'active':''}`} onClick={()=>{setPage(0);setListFilter('');}}>
     <span className="list-dot" style={{background:'#2563eb'}}/> All contacts
    </button>
    {lists.map(l=><div key={l._id} className={`list-item ${listFilter===l._id?'active':''}`}>
     {renameId===l._id
      ? <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)}
         onBlur={()=>saveRename(l._id)} onKeyDown={e=>{if(e.key==='Enter')saveRename(l._id);}}/>
      : <button className="list-link" onClick={()=>{setPage(0);setListFilter(l._id);}} onDoubleClick={()=>{setRenameId(l._id);setRenameValue(l.name);}}>
        <span className="list-dot" style={{background:l.color||'#b58a3a'}}/> {l.name} <b>{l.count||0}</b></button>}
     <span className="row" style={{gap:2}}>
      <button className="icon-btn sm" title="Rename" onClick={()=>{setRenameId(l._id);setRenameValue(l.name);}}><Icon name="code" size={13}/></button>
      <button className="icon-btn sm" title="Delete" onClick={()=>removeList(l)}><Icon name="close" size={13}/></button>
     </span>
    </div>)}
    <div className="divider"/>
    <label>New list / category</label>
    <div className="row"><input style={{flex:1,minWidth:0}} placeholder="e.g. Agency leads" value={newList}
      onChange={e=>setNewList(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')createList();}}/>
     <button className="btn sm" onClick={createList}><Icon name="plus" size={14}/></button></div>
   </div>

   <div>
    <div className="card luxe-card" style={{padding:16}}>
     <h2>Add contact {listFilter?`to ${listName(listFilter)}`:'(uncategorised)'}</h2>
     <div className="contact-add">
      <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
      <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
      <input placeholder="Company" value={company} onChange={e=>setCompany(e.target.value)}/>
      <button className="btn sm" onClick={addContact}><Icon name="plus" size={14}/> Save contact</button>
     </div>
    </div>
    <div className="card table-card luxe-card" style={{marginTop:14}}>
     <div className="contacts-bulk-bar">
       <b>{selected.length} selected</b><span className="muted">Selection is for this page only</span>
       <select value={targetList} onChange={e=>setTargetList(e.target.value)} aria-label="Destination list"><option value="">Choose list…</option>{lists.map(l=><option key={l._id} value={l._id}>{l.name}</option>)}</select>
       <button className="btn secondary sm" disabled={!selected.length||actionBusy||contactsLoading} onClick={()=>doBulk('add_to_list')}>Add to list</button>
       <button className="btn sm" disabled={!selected.length||verifyBusy||contactsLoading} onClick={()=>verifyContacts(selected)} title="1 credit per real check · fresh duplicates free">
         {verifyBusy?'Queuing…':'Verify selected'}</button>
       <button className="btn ghost sm" disabled={!selected.length||actionBusy||contactsLoading} onClick={()=>doBulk('delete')}>Delete selected</button>
     </div>
     {vStats && <div className="row" style={{gap:6,flexWrap:'wrap',padding:'0 14px 10px',alignItems:'center'}}>
       <button className={`chip ${!verifFilter?'chip-active':''}`} onClick={()=>{setPage(0);setVerifFilter('');}}>All {vStats.total??0}</button>
       <button className={`chip ${verifFilter==='UNVERIFIED'?'chip-active':''}`} onClick={()=>{setPage(0);setVerifFilter(verifFilter==='UNVERIFIED'?'':'UNVERIFIED');}}>Not checked {vStats.counts?.UNVERIFIED??0}</button>
       {['PENDING','VALID','INVALID','CATCH_ALL','RISKY','UNKNOWN','ERROR'].map(s=>
         (vStats.counts?.[s]>0 || verifFilter===s) &&
         <button key={s} className={`chip ${verifFilter===s?'chip-active':''}`}
           onClick={()=>{setPage(0);setVerifFilter(verifFilter===s?'':s);}}>{s==='CATCH_ALL'?'Catch-all':s[0]+s.slice(1).toLowerCase()} {vStats.counts?.[s]??0}</button>)}
       <span className="muted" style={{marginLeft:'auto',fontSize:11}}>
         {vStats.credits ? `verification credits: ${vStats.credits.remaining<0?'unlimited':vStats.credits.remaining} left` : ''}
       </span>
     </div>}
     <table><thead><tr><th><input type="checkbox" disabled={contactsLoading} aria-label="Select all contacts on this page" checked={visible.length>0 && visible.every(c=>selected.includes(c._id))} onChange={e=>setSelected(e.target.checked?visible.map(c=>c._id):[])} /></th><th>Contact</th><th>Company</th><th>Categories</th><th>Status</th><th>Verified</th><th></th></tr></thead><tbody>
      {visible.map(c=><tr key={c._id}>
       <td><input type="checkbox" aria-label={`Select ${c.email}`} checked={selected.includes(c._id)} onChange={()=>toggleSelected(c._id)} /></td>
       <td><div className="row"><span className="avatar">{(c.email||'?')[0].toUpperCase()}</span>
        <div><b>{c.firstName||c.email.split('@')[0]}</b><div className="muted" style={{fontSize:11}}>{c.email}</div></div></div></td>
       <td>{c.company||'—'}</td>
       <td><div className="row" style={{gap:4}}>{(c.listIds||[]).length
        ? (c.listIds||[]).map(x=><span className="badge" key={x}>{listName(x)}</span>)
        : <span className="muted">uncategorised</span>}</div></td>
       <td><span className={`badge ${c.status === 'bounced' ? 'danger' : c.status === 'unsubscribed' ? 'warn' : 'ok'}`}>
         {c.status || 'subscribed'}</span>
        <div className="muted" style={{fontSize:11}}>{c.consentSource ? `consent · ${c.consentSource}` : 'consent · not recorded'}</div></td>
       <td>{(() => { const v = effVerification(c); return v
        ? <span className={`badge ${{VALID:'ok',INVALID:'danger',CATCH_ALL:'warn',RISKY:'warn',ERROR:'warn',PENDING:'',UNKNOWN:''}[v.status]||''}`}
            title={v.reason||''}>{v.status==='CATCH_ALL'?'catch-all':v.status.toLowerCase()}</span>
        : <span className="muted" style={{fontSize:11}}>not checked</span>; })()}</td>
       <td><button className="btn ghost sm" onClick={()=>openEditor(c)}><Icon name="contacts" size={14}/> Lists</button>
        {c.verification?.status!=='VALID' && <button className="btn ghost sm" disabled={verifyBusy}
          onClick={()=>verifyContacts([c._id])} aria-label={`Verify ${c.email}`} title="Verify this address (1 credit if a real check is needed)">Verify</button>}
        <button className="btn ghost sm" disabled={actionBusy} onClick={()=>doBulk('delete',[c._id])} aria-label={`Delete ${c.email}`}>Delete</button></td>
      </tr>)}
      {contactsLoading && !visible.length && [0,1,2,3,4].map(r=><tr key={`sk${r}`} aria-hidden="true">
       {[0,1,2,3,4,5,6].map(cell=><td key={cell}><span className="skeleton-block" style={{display:'block',width:`${46+((r+cell)%3)*16}%`,height:9}}/></td>)}
      </tr>)}
      {!contactsLoading && !visible.length&&<tr><td colSpan={7}><div className="empty">No contacts here yet.</div></td></tr>}
     </tbody></table>
     <div className="contacts-page-nav"><span>{total ? `${page*100+1}–${Math.min((page+1)*100,total)} of ${total}` : '0 contacts'}</span><button className="btn ghost sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="btn ghost sm" disabled={(page+1)*100>=total} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </div>
   </div>
  </div>

  {personalizeOpen && <FullPageDialog title="Make every email personal" eyebrow="PERSONALIZATION" description="Create reusable fields for more meaningful messages — with a fallback whenever a value is missing." onClose={()=>setPersonalizeOpen(false)}>
   <div className="fp-grid"><section className="fp-card"><div className="fp-card-head"><div className="fp-icon"><Icon name="code" size={20}/></div><div><h2>Your fields</h2><p>Use these tokens in your email subject or content.</p></div></div>
    <div className="fp-token-grid">{['first_name','last_name','company','email','sender_name'].map(t=><div className="fp-token" key={t}><code>{'{{'+t+'}}'}</code><span>Built-in</span></div>)}
     {customTokens.map(t=><div className="fp-token" key={t._id || t.token}><code>{'{{'+t.token+'}}'}</code><span>{t.label||'Custom'}</span></div>)}</div>
    <div className="fp-separator"/><h2>Create a field</h2><p className="fp-muted">Add a token, display name and optional fallback.</p>
    <div className="fp-fields"><div><label htmlFor="token-name">Token name</label><input id="token-name" placeholder="e.g. city" value={newToken.token} onChange={e=>setNewToken({...newToken,token:e.target.value})}/></div><div><label htmlFor="token-label">Label</label><input id="token-label" placeholder="e.g. City" value={newToken.label} onChange={e=>setNewToken({...newToken,label:e.target.value})}/></div><div><label htmlFor="token-fallback">Fallback <span>(optional)</span></label><input id="token-fallback" placeholder="e.g. your city" value={newToken.fallback} onChange={e=>setNewToken({...newToken,fallback:e.target.value})}/></div></div>
    <div className="fp-actions"><button className="btn secondary" onClick={()=>setPersonalizeOpen(false)}>Done</button><button className="btn" disabled={tokenBusy||!newToken.token.trim()} onClick={async()=>{setTokenBusy(true);try{await post('/personalization/tokens',newToken);setNewToken({token:'',label:'',fallback:''});toast('Field added');loadTokens();}catch(e){notify(toast,e);}finally{setTokenBusy(false);}}}><Icon name="plus" size={15}/> {tokenBusy?'Adding…':'Add field'}</button></div>
   </section><aside className="fp-side"><div className="fp-side-icon">✧</div><h3>Thoughtful messages,
at every scale.</h3><p>Tokens bring contact details into your templates. CSV imports can also create fields from extra columns.</p><div className="fp-side-rule"/><span>PERSONAL BY DESIGN</span></aside></div>
  </FullPageDialog>}

  {editContact && <Modal title={`Categories · ${editContact.email}`} onClose={()=>setEditContact(null)}
   footer={<><button className="btn secondary" onClick={()=>setEditContact(null)}>Cancel</button>
    <button className="btn" onClick={saveEditor}>Save</button></>}>
   <p className="muted">Select every list this contact belongs to. A contact can be in multiple categories.</p>
   <div className="picker" style={{marginTop:12,maxHeight:300}}>
    {lists.map(l=><label key={l._id} className="pick"><input type="checkbox" checked={editLists.includes(l._id)}
      onChange={()=>toggleEdit(l._id)}/>{l.name}</label>)}
    {!lists.length&&<span className="muted">Create a list first.</span>}
   </div>
  </Modal>}
 </>;
}

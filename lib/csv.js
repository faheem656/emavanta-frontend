/** Small CSV parser with quoted-field support. Header is optional; first email column is used. */
export const parseCSV = text => {
  const rows=[]; let row=[], cur='', quoted=false;
  for(let i=0;i<String(text||'').length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){cur+='"';i++;}
      else if(ch==='"')quoted=false;
      else cur+=ch;
    } else if(ch==='"')quoted=true;
    else if(ch===','){row.push(cur);cur='';}
    else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur='';}
    else if(ch!=='\r')cur+=ch;
  }
  if(cur||row.length){row.push(cur);rows.push(row);}
  if(!rows.length)return [];
  const head=rows[0].map(x=>String(x).toLowerCase().trim());
  const find=(...names)=>head.findIndex(h=>names.includes(h));
  const emailIdx=find('email','email address','e-mail','mail');
  const nameIdx=find('name','first name','firstname','full name');
  const companyIdx=find('company','organization','organisation');
  const body=emailIdx>=0?rows.slice(1):rows;
  const columns = rows[0].map((h,i)=>String(h||`column_${i+1}`).trim());
  const mapped = body.map(r=>{
    const email=String(r[emailIdx>=0?emailIdx:0]||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(email))return null;
    return { email, firstName:String(nameIdx>=0?r[nameIdx]:email.split('@')[0]).trim(),
      company:String(companyIdx>=0?r[companyIdx]:'').trim(), customFields:{},
      __raw: Object.fromEntries(columns.map((c,i)=>[c, String(r[i] ?? '').trim()])) };
  }).filter(Boolean);
  mapped.columns = columns;
  return mapped;
};

/** Guess a target field for each CSV column so users rarely have to change anything. */
export const guessMapping = columns => Object.fromEntries(columns.map(c => {
  const k = String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = ['email','emailaddress','mail','workemail'].includes(k) ? 'email'
    : ['name','fullname','firstname','first'].includes(k) ? 'firstName'
    : ['lastname','surname'].includes(k) ? 'lastName'
    : ['company','organization','organisation','companyname','account'].includes(k) ? 'company'
    : ['phone','mobile','phonenumber','tel'].includes(k) ? 'phone'
    : ['city','town','location'].includes(k) ? 'city'
    : ['country'].includes(k) ? 'country'
    : ['title','jobtitle','role','position'].includes(k) ? 'title'
    : 'custom';
  return [c, target];
}));

/** Build one contact payload per row using the confirmed column mapping. */
export const buildContacts = (rows, mapping) => rows.map(r => {
  const raw = r.__raw || {};
  const contact = { email:'', firstName:'', lastName:'', company:'', phone:'', city:'', country:'', title:'', customFields:{} };
  Object.entries(mapping).forEach(([column, target]) => {
    const value = raw[column];
    if (!value || target === 'ignore') return;
    if (target === 'custom') contact.customFields[column.replace(/[^a-zA-Z0-9_.]/g, '_').toLowerCase()] = value;
    else contact[target] = value;
  });
  if (!contact.email) contact.email = r.email || '';
  if (!contact.firstName) contact.firstName = (contact.email || '').split('@')[0];
  Object.keys(contact).forEach(k => { if (contact[k] === '') delete contact[k]; });
  return contact;
}).filter(c => /^\S+@\S+\.\S+$/.test(c.email || ''));

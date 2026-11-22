'use client';
import { useEffect, useState } from 'react';
import { get, post } from '../lib/api';
export default function TeamTable() {
  const [members,setMembers] = useState([]);
  const [email,setEmail] = useState('');
  const [msg,setMsg] = useState('');
  const load = () => get('/team/members').then(setMembers).catch(e=>setMsg(e.message));
  useEffect(() => { load(); }, []);
  const invite = async () => {
    try { const r = await post('/team/invite',{email,role:'member'}); setMsg(`Invite created: ${r.inviteUrl}`); setEmail(''); load(); }
    catch(e){ setMsg(e.message); }
  };
  return <div className="card">
    <h2>Members</h2>
    <div className="row"><input placeholder="teammate@company.com" value={email} onChange={e=>setEmail(e.target.value)} />
      <button className="btn" onClick={invite}>Invite member</button></div>
    {msg && <p className="muted">{msg}</p>}
    <table style={{marginTop:16}}><thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead><tbody>
      {members.map(m=><tr key={m._id}><td>{m.userId}</td><td><span className="badge">{m.role}</span></td><td>{m.status}</td></tr>)}
    </tbody></table>
  </div>;
}

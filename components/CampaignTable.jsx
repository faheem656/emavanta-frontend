'use client';
import { useEffect, useState } from 'react';
import { get, post } from '../lib/api';
export default function CampaignTable() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const load = () => get('/campaigns').then(setItems).catch(e => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const launch = async id => {
    setMsg('Checking preflight and quota…');
    try {
      const check = await post(`/campaigns/${id}/launch`, { confirm: true });
      setMsg(`Launched: ${check.queued} recipients queued.`);
      load();
    } catch (e) { setMsg(e.message); }
  };
  return <>
    {msg && <p className="muted">{msg}</p>}
    <table><thead><tr><th>Name</th><th>Stream</th><th>Status</th><th>Queued</th><th>Sent</th><th></th></tr></thead>
      <tbody>{items.map(c => <tr key={c._id}><td>{c.name}</td><td>{c.stream}</td>
        <td><span className={`badge ${c.status === 'queued' ? 'ok' : ''}`}>{c.status}</span></td>
        <td>{c.stats?.queued || 0}</td><td>{c.stats?.sent || 0}</td>
        <td><button className="btn secondary" onClick={() => launch(c._id)} disabled={c.status === 'queued'}>Launch</button></td></tr>)}</tbody></table>
  </>;
}

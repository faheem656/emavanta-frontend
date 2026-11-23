'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, patch } from '../lib/api';
import PageHead from './PageHead';
import Icon from './Icon';
import { useToast } from './ToastProvider';
import { notify } from '../lib/notify';
import { CardGridSkeleton } from './DashboardSkeleton';

const arr = value => Array.isArray(value) ? value : (value?.items || []);
const ROTATIONS = [
  ['round_robin', 'Round robin · rotate per recipient'],
  ['least_used', 'Least used · balance today’s sends'],
  ['weighted', 'Weighted · use mailbox weights'],
  ['random_jitter', 'Randomized selection'],
  ['sticky_by_contact', 'Sticky · keep each contact on one mailbox']
];

export default function CampaignEditor() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [campaign, setCampaign] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    Promise.all([get(`/campaigns/${encodeURIComponent(id)}`), get('/templates'), get('/contacts/lists'), get('/accounts')])
      .then(([row, templateRows, listRows, accountRows]) => {
        if (!alive) return;
        const senderRows = arr(accountRows);
        const currentStream = row.stream || 'outreach';
        const eligibleIds = new Set(senderRows.filter(a => a.status === 'active'
          && (!a.stream || a.stream === currentStream)
          && (!a.tokenExpiresAt || Date.parse(a.tokenExpiresAt) > Date.now())).map(a => a._id));
        setCampaign(row);
        setTemplates(arr(templateRows));
        setLists(arr(listRows));
        setAccounts(senderRows);
        setForm({
          name: row.name || '', description: row.description || '', stream: currentStream,
          sendMode: row.sendMode || 'human', gapSeconds: row.gapSeconds || 60,
          templateId: row.templateId || '', listIds: row.listIds || [],
          accountPool: (row.accountPool || []).filter(accountId => eligibleIds.has(accountId)),
          rotation: row.rotation || 'round_robin',
          dailyCap: row.sendPolicy?.dailyCap || 50
        });
      })
      .catch(e => { if (alive) setError(e.message || 'Could not load this campaign.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const availableAccounts = useMemo(() => accounts.filter(a => a.status === 'active'
    && (!a.stream || a.stream === form?.stream)
    && (!a.tokenExpiresAt || Date.parse(a.tokenExpiresAt) > Date.now())), [accounts, form?.stream]);
  const readyToLaunch = !!form?.templateId && form.listIds.length > 0 && form.accountPool.length > 0;
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleList = listId => setForm(current => ({ ...current,
    listIds: current.listIds.includes(listId) ? current.listIds.filter(id => id !== listId) : [...current.listIds, listId] }));
  const toggleAccount = accountId => setForm(current => ({ ...current,
    accountPool: current.accountPool.includes(accountId) ? current.accountPool.filter(id => id !== accountId) : [...current.accountPool, accountId] }));

  const save = async () => {
    if (!form || !campaign) return;
    if (campaign.status !== 'draft') { toast('Only draft campaigns can be edited.', 'warn'); return; }
    if (form.name.trim().length < 2) { toast('Give the campaign a name first.', 'warn'); return; }
    if (!templates.some(t => t._id === form.templateId)) { toast('Choose an available template.', 'warn'); return; }
    if (form.accountPool.some(accountId => !availableAccounts.some(a => a._id === accountId))) {
      toast('Remove inactive or incompatible mailboxes from the sender pool.', 'warn'); return;
    }
    setBusy(true);
    try {
      const gap = Math.max(5, Number(form.gapSeconds) || 60);
      const dailyCap = Math.max(1, Number(form.dailyCap) || 50);
      const updated = await patch(`/campaigns/${encodeURIComponent(id)}`, {
        name: form.name.trim(), description: form.description.trim(), stream: form.stream,
        sendMode: form.sendMode, gapSeconds: form.sendMode === 'human' ? gap : undefined,
        listIds: form.listIds, templateId: form.templateId, accountPool: form.accountPool,
        rotation: form.rotation,
        sendPolicy: {
          ...(campaign.sendPolicy || {}),
          minDelaySec: form.sendMode === 'human' ? Math.max(5, Math.round(gap * 0.8)) : 5,
          maxDelaySec: form.sendMode === 'human' ? Math.max(10, Math.round(gap * 1.2)) : 10,
          jitterPct: form.sendMode === 'human' ? 20 : 0,
          activeHours: form.sendMode === 'human' ? { start: 9, end: 18 } : { start: 0, end: 24 },
          timezone: campaign.sendPolicy?.timezone || 'UTC',
          dailyCap, weeklyCap: dailyCap * 5,
          weekend: form.sendMode === 'blast', pauseOnReply: form.sendMode === 'human',
          warmup: !!campaign.sendPolicy?.warmup
        }
      });
      setCampaign(updated);
      toast('Campaign draft updated. It will not send until you explicitly launch it.');
      router.push('/dashboard/campaigns');
    } catch (e) { notify(toast, e); }
    finally { setBusy(false); }
  };

  if (loading) return <>
    <PageHead title="Edit campaign" subtitle="Update this saved campaign draft." />
    <CardGridSkeleton count={4} />
  </>;
  if (!campaign || !form) return <>
    <PageHead title="Campaign unavailable" subtitle="This draft could not be opened." />
    <div className="notice warn">{error || 'The campaign may have been deleted or is outside this workspace.'}</div>
    <Link className="btn secondary sm" href="/dashboard/campaigns">Back to campaigns</Link>
  </>;

  const locked = campaign.status !== 'draft';
  return <>
    <PageHead title="Edit campaign draft" subtitle={campaign.starterContent ? 'Make this working example your own. It remains a draft until you launch it.' : 'Update your campaign settings before launch.'}
      actions={<Link className="btn secondary sm" href="/dashboard/campaigns"><Icon name="chevron" size={14} /> Back</Link>} />
    {locked && <div className="notice warn">This campaign is {campaign.status}; only draft campaigns can be edited. Pause it and create a new draft if you need to change the content.</div>}
    {!readyToLaunch && <div className="notice" style={{ marginBottom: 14 }}>
      <b>Setup checklist:</b> choose a template, at least one audience list, and at least one active, verified mailbox. Saving a draft is safe; sending only begins after an explicit launch confirmation.
    </div>}

    <div className="campaign-editor-grid">
      <section className="card luxe-card">
        <div className="mini-row"><div><span className="template-eyebrow">CAMPAIGN DRAFT</span><h2 style={{ margin: '5px 0 0' }}>{campaign.name}</h2></div>
          <span className={`badge ${campaign.starterContent ? 'ok' : ''}`}>{campaign.starterContent ? 'Starter draft' : campaign.status}</span></div>
        <label style={{ marginTop: 18 }}>Campaign name</label>
        <input disabled={locked} className="campaign-editor-input" value={form.name} maxLength={120} onChange={e => set('name', e.target.value)} />
        <label style={{ marginTop: 14 }}>Purpose and notes</label>
        <textarea disabled={locked} className="campaign-editor-input" rows={4} maxLength={280} value={form.description}
          placeholder="What this send is for, who should receive it, and what to personalize before launch."
          onChange={e => set('description', e.target.value)} />
        <div className="campaign-editor-two">
          <div><label>Stream</label><select disabled={locked} value={form.stream} onChange={e => {
            const stream = e.target.value;
            const allowed = new Set(accounts.filter(a => a.status === 'active' && (!a.stream || a.stream === stream)
              && (!a.tokenExpiresAt || Date.parse(a.tokenExpiresAt) > Date.now())).map(a => a._id));
            setForm(current => ({ ...current, stream, accountPool: current.accountPool.filter(accountId => allowed.has(accountId)) }));
          }}>{['marketing', 'outreach', 'transactional'].map(value => <option key={value}>{value}</option>)}</select></div>
          <div><label>Email template</label><select disabled={locked} value={form.templateId} onChange={e => set('templateId', e.target.value)}>
            <option value="">Choose a template…</option>{templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select></div>
        </div>
        <label style={{ marginTop: 16 }}>Audience lists <span className="muted">({form.listIds.length} selected)</span></label>
        <div className="campaign-editor-picks">
          {lists.map(list => <label className="pick" key={list._id}><input disabled={locked} type="checkbox" checked={form.listIds.includes(list._id)} onChange={() => toggleList(list._id)} />
            <span>{list.name || 'Untitled list'}</span><span className="muted">{list.count ?? 0}</span></label>)}
          {!lists.length && <div className="muted">No lists yet. Add contacts and create an audience list before launch.</div>}
        </div>
      </section>

      <aside className="card luxe-card">
        <span className="template-eyebrow">SENDER POOL</span>
        <h2 style={{ margin: '5px 0 6px' }}>Rotate across mailboxes</h2>
        <p className="muted">Every recipient is assigned from this selected pool using your rotation strategy. Only active, verified mailboxes compatible with this stream can send.</p>
        <label style={{ marginTop: 15 }}>Sending mailboxes <span className="muted">({form.accountPool.length} selected)</span></label>
        <div className="campaign-editor-picks sender-picks">
          {accounts.map(account => {
            const eligible = availableAccounts.some(a => a._id === account._id);
            return <label className={`pick ${!eligible ? 'pick-disabled' : ''}`} key={account._id}>
              <input disabled={locked || !eligible} type="checkbox" checked={form.accountPool.includes(account._id)} onChange={() => toggleAccount(account._id)} />
              <span>{account.fromEmail || 'Mailbox'}</span>
              <span className={`badge ${eligible ? 'ok' : 'warn'}`}>{eligible ? 'verified' : account.status || 'unavailable'}</span>
            </label>;
          })}
          {!accounts.length && <div className="muted">No mailboxes are connected. <Link href="/dashboard/accounts">Connect a sender</Link>.</div>}
          {!!accounts.length && !availableAccounts.length && <div className="muted">No verified sender is available for this stream. <Link href="/dashboard/accounts">Review mailboxes</Link>.</div>}
        </div>
        <label style={{ marginTop: 15 }}>Rotation strategy</label>
        <select disabled={locked} value={form.rotation} onChange={e => set('rotation', e.target.value)}>
          {ROTATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="campaign-editor-two" style={{ marginTop: 14 }}>
          <div><label>Sending mode</label><select disabled={locked} value={form.sendMode} onChange={e => set('sendMode', e.target.value)}>
            <option value="human">Human-paced</option><option value="blast">Email blast</option>
          </select></div>
          <div><label>Daily cap per mailbox</label><input disabled={locked} type="number" min={1} max={2000} value={form.dailyCap}
            onChange={e => set('dailyCap', e.target.value)} /></div>
        </div>
        {form.sendMode === 'human' && <><label style={{ marginTop: 12 }}>Pause between emails (seconds)</label>
          <input disabled={locked} type="number" min={5} max={3600} value={form.gapSeconds} onChange={e => set('gapSeconds', e.target.value)} />
        </>}
        <div className="notice" style={{ marginTop: 14 }}>This is a draft. Nothing sends until the campaign is reviewed and explicitly launched.</div>
      </aside>
    </div>
    <div className="campaign-editor-footer">
      <Link className="btn ghost" href="/dashboard/campaigns">Cancel</Link>
      <button className="btn" disabled={locked || busy} onClick={save}>
        <Icon name="check" size={14} /> {busy ? 'Saving…' : 'Save draft changes'}
      </button>
    </div>
  </>;
}

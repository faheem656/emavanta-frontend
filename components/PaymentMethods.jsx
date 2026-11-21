'use client';
import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../lib/api';
import Modal from './Modal';
import Icon from './Icon';
import CardFields, { validateCardFields, fieldErrorsFrom } from './CardFields';
import { useToast } from './ToastProvider';
import { notify } from '../lib/notify';

const brandIcon = brand => String(brand || '').toLowerCase();
/** "visa" → "Visa" — brands come lower-cased from the API. */
const brandLabel = brand => brandIcon(brand).replace(/^./, c => c.toUpperCase()) || 'Card';

/**
 * Cards on file, managed inside the billing page: add, set default, remove.
 * We only ever see brand + last four + expiry because the API never stores a PAN.
 */
export default function PaymentMethods({ onChanged }) {
  const toast = useToast();
  const [state, setState] = useState({ methods: [], max: 10, canAdd: true });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  const load = () => get('/billing/payment-methods')
    .then(r => setState({ methods: Array.isArray(r?.methods) ? r.methods : [], max: r?.max ?? 10, canAdd: r?.canAdd !== false }))
    .catch(e => notify(toast, e))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const open = () => { setCard({ number: '', expiry: '', cvc: '', name: '' }); setErrors({}); setAdding(true); };

  const save = async () => {
    const found = validateCardFields(card);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy('add');
    try {
      const r = await post('/billing/payment-methods', { card });
      setAdding(false);
      toast(`${brandLabel(r.method.brand)} •••• ${r.method.last4} saved${r.method.isDefault ? ' as the default card' : ''}`);
      await load(); onChanged?.();
    } catch (e) {
      const fieldErrors = fieldErrorsFrom(e.details || e);
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        toast({ title: 'Check the card details', level: 'warn', message: Object.values(fieldErrors)[0] });
      } else {
        toast({ title: 'Card not saved', level: 'warn', message: e.message });
      }
    } finally { setBusy(''); }
  };

  const makeDefault = async m => {
    setBusy(m._id);
    try { await patch(`/billing/payment-methods/${m._id}`, { isDefault: true }); toast(`${brandLabel(m.brand)} •••• ${m.last4} is now the default card`); await load(); onChanged?.(); }
    catch (e) { notify(toast, e); } finally { setBusy(''); }
  };

  const remove = async m => {
    if (!window.confirm(`Remove ${brandLabel(m.brand)} •••• ${m.last4}? You can add it again any time.`)) return;
    setBusy(m._id);
    try {
      await del(`/billing/payment-methods/${m._id}`);
      toast(`${brandLabel(m.brand)} •••• ${m.last4} removed`);
      await load(); onChanged?.();
    } catch (e) { notify(toast, e); } finally { setBusy(''); }
  };

  return <div className="card" id="payment-methods">
    <div className="mini-row">
      <div>
        <h2 style={{ margin: 0 }}>Payment methods</h2>
        <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
          Add a card once and pay any plan or add-on in one click. Cards are chargeable from this page only — nothing is sent to an external checkout.
        </p>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <span className="badge">{state.methods.length}/{state.max}</span>
        <button className="btn sm" onClick={open} disabled={!state.canAdd || loading}
          title={state.canAdd ? 'Add a card to this workspace' : `You can keep ${state.max} cards — remove one first`}>
          <Icon name="plus" size={14} /> Add card
        </button>
      </div>
    </div>

    {loading && <p className="muted" style={{ marginTop: 12 }}>Loading your cards…</p>}

    {!loading && !state.methods.length && <div className="empty-cards">
      <div className="empty-cards-icon"><Icon name="card" size={20} /></div>
      <div>
        <b>No card on file</b>
        <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
          Add one to enable one-click payments. Test card: <code>4242 4242 4242 4242</code>.
        </p>
      </div>
    </div>}

    <div className="card-list">
      {state.methods.map(m => <div key={m._id} className={`saved-card ${m.isDefault ? 'default' : ''}`}>
        <span className={`saved-card-brand ${brandIcon(m.brand)}`}><Icon name="card" size={16} /></span>
        <span className="saved-card-body">
          <b>{brandLabel(m.brand)} •••• {m.last4}</b>
          <span className="muted" style={{ fontSize: 11.5 }}>
            Expires {String(m.expMonth).padStart(2, '0')}/{String(m.expYear)}
            {m.name ? ` · ${m.name}` : ''}
            {m.addedBy ? ` · added by ${m.addedBy}` : ''}
          </span>
        </span>
        {m.isDefault
          ? <span className="badge ok">Default</span>
          : <button className="btn ghost sm" onClick={() => makeDefault(m)} disabled={busy === m._id}>Make default</button>}
        <button className="icon-btn sm" title={`Remove card ending ${m.last4}`} onClick={() => remove(m)} disabled={busy === m._id}>
          <Icon name="close" size={12} />
        </button>
      </div>)}
    </div>

    {!state.canAdd && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
      You can keep {state.max} cards on file — remove one to add another.
    </p>}

    <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
      <Icon name="shield" size={11} /> The full card number and CVC are never stored — only the brand, last four digits,
      expiry and a one-way token used to charge the card.
    </p>

    {adding && <Modal title="Add a card" onClose={() => setAdding(false)}
      footer={<><button className="btn secondary" onClick={() => setAdding(false)} disabled={busy === 'add'}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy === 'add'}>{busy === 'add' ? 'Saving…' : 'Save card'}</button></>}>
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 12 }}>
        The card is stored against your workspace as a token. It is only charged when you buy a plan or add-on.
      </p>
      <div className="card-form">
        <div className="card-form-head">
          <b>Card details</b>
          <span className={`badge ${state.methods.length ? '' : 'ok'}`}>
            {state.methods.length ? `Card ${state.methods.length + 1} of ${state.max}` : 'First card'}
          </span>
        </div>
        <CardFields card={card} setCard={setCard} errors={errors} setErrors={setErrors} />
      </div>
      <div className="pay-note" style={{ marginTop: 12 }}>
        <Icon name="shield" size={13} />
        <span>Saving a card never charges it. Test card: <code>4242 4242 4242 4242</code>, any future expiry, any 3 digits.</span>
      </div>
    </Modal>}
  </div>;
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { get, post } from '../lib/api';
import SlideOver from './SlideOver';
import CryptoWalletNotice from './CryptoWalletNotice';
import StripeCardCheckout from './StripeCardCheckout';
import Icon from './Icon';
import CardFields, { validateCardFields, fieldErrorsFrom, brandOf } from './CardFields';
import { useToast } from './ToastProvider';

const FRIENDLY = {
  CARD_DECLINED: 'Your bank declined this card. Nothing was charged — try another card.',
  INSUFFICIENT_FUNDS: 'This card does not have enough funds. Nothing was charged.',
  PROCESSING_ERROR: 'The payment processor hiccuped. Nothing was charged — try again.',
  CARD_EXPIRED: 'That card has expired — pick another one or add a new card.',
  CARD_MISSING: 'That saved card is no longer on file — add it again.',
  PAYMENT_REQUIRED: 'This purchase needs a completed payment first.',
  VALIDATION_ERROR: 'Some details need fixing before we can charge the card.'
};

const EMPTY_CARD = { number: '', expiry: '', cvc: '', name: '' };

/**
 * Premium in-dashboard checkout: a slide-over from the right, three clear stages
 * (order → payment → receipt). No hosted page, no redirect, no PAN ever stored.
 */
export default function CheckoutPanel({ intent, onClose, onPaid }) {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [methods, setMethods] = useState(null);
  const [useSaved, setUseSaved] = useState(null);
  const [card, setCard] = useState(EMPTY_CARD);
  const [saveCard, setSaveCard] = useState(true);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [startError, setStartError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [cardStarted, setCardStarted] = useState(false), [cryptoStarted,setCryptoStarted]=useState(false), [cryptoBusy,setCryptoBusy]=useState(false), [pendingOrder,setPendingOrder]=useState(null);

  useEffect(() => {
    if (!intent) return;
    let alive = true;
    setCardStarted(false); setCryptoStarted(false); setPendingOrder(null); setSession(null); setReceipt(null); setFailure(null); setStartError(null); setErrors({});
    setCard(EMPTY_CARD); setSaveCard(true); setMethods(null); setUseSaved(null);
    setBusy('session');

    get('/billing/payment-methods').then(r => {
      if (!alive) return;
      const list = Array.isArray(r?.methods) ? r.methods : [];
      setMethods(list);
      // Never preselect a card the server already knows cannot be charged — that is how a
      // buyer ends up pressing Pay and reading the same 402 twice.
      const usable = list.filter(m => m.usable !== false);
      setUseSaved(usable.length ? (usable.find(m => m.isDefault) || usable[0])._id : 'new');
    }).catch(() => { if (alive) { setMethods([]); setUseSaved('new'); } });

    post('/billing/session', intent)
      .then(r => {
        if (!alive) return;
        if (r?.free) { setReceipt({ free: true, plan: r.plan }); onPaid?.(r); return; }
        if (!r?.sessionId) { setStartError({ message: 'The checkout did not return an order. Please try again.' }); return; }
        setSession(r);
      })
      .catch(e => { if (alive) setStartError({ message: e?.message || 'The checkout could not start.', stale: !!e?.stale, offline: !!e?.offline }); })
      .finally(() => { if (alive) setBusy(''); });
    return () => { alive = false; };
  }, [intent?.kind, intent?.plan, intent?.code, intent?.quantity, intent?.interval, attempt]);

  const amount = pendingOrder?.amount ?? session?.amount ?? intent?.amount ?? 0;
  const savedList = methods || [];
  const payingNew = useSaved === 'new' || !savedList.length;
  const brand = useMemo(() => brandOf(card.number), [card.number]);
  const stage = receipt ? 'done' : startError ? 'error' : session ? 'pay' : 'loading';

  const pay = async () => {
    if (!session || busy) return;
    if (payingNew) {
      const found = validateCardFields(card);
      setErrors(found);
      if (Object.keys(found).length) {
        toast({ title: 'Check the card details', level: 'warn', message: Object.values(found)[0] });
        document.querySelector(`[data-card-field="${Object.keys(found)[0]}"]`)?.scrollIntoView({ block: 'center' });
        return;
      }
    }
    setBusy('pay'); setFailure(null);
    try {
      const body = payingNew ? { card, saveCard } : { paymentMethodId: useSaved };
      const r = await post(`/billing/session/${session.sessionId}/pay`, body);
      setReceipt(r);
      if (r.savedMethod) setMethods(m => [...(m || []).filter(x => x._id !== r.savedMethod._id), r.savedMethod]);
      toast(payingNew && saveCard ? 'Payment successful — card saved for next time' : 'Payment successful');
      onPaid?.(r);
    } catch (e) {
      const fieldErrors = fieldErrorsFrom(e.details || e);
      const deadCard = ['CARD_EXPIRED', 'CARD_MISSING', 'CARD_DECLINED'].includes(e.code)
        || e.details?.fallbackToNewCard === true;
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        setFailure({ message: Object.values(fieldErrors)[0], code: e.code, field: true });
      } else if (deadCard) {
        // Recover instead of repeating: drop the unusable card from the list and open the
        // new-card form, keeping the honest reason visible.
        setMethods(list => (list || []).map(m => m._id === useSaved ? { ...m, usable: false, reason: 'unusable' } : m));
        setUseSaved('new');
        setFailure({ message: FRIENDLY[e.code] || e.message || 'That saved card cannot be charged.',
          code: e.code, declined: true, switched: true });
      } else {
        setFailure({ message: FRIENDLY[e.code] || e.message || 'The payment did not complete.',
          code: e.code, stale: !!e.stale, declined: e.status === 402 });
      }
    } finally { setBusy(''); }
  };

  if (!intent) return null;
  const label = pendingOrder ? (pendingOrder.kind==='addon'?`${pendingOrder.code} × ${pendingOrder.quantity||1}`:`${pendingOrder.plan||'Existing'} plan`) : (session?.label || intent.label || (intent.kind === 'plan' ? `${intent.plan} plan` : 'Your order'));
  const showDescription=pendingOrder?'Existing USDT order · Review the original amount and terms':session?.description;
  const closeCheckout=async()=>{
    if(busy||cryptoBusy)return;
    if(pendingOrder?.cancelable){
      if(!window.confirm(`Cancel the existing ${pendingOrder.amount} USDT order? No transfer has been requested through this checkout.`))return;
      setBusy('cancel');try{await post(`/billing/crypto/${encodeURIComponent(pendingOrder.orderId)}/cancel`,{});setPendingOrder(null);}catch(e){setFailure({message:e.message});return;}finally{setBusy('');}
    }
    onClose?.();
  };
  const canPay = session?.stripeEnabled === true && stage === 'pay' && !busy && (payingNew ? true : !!useSaved);

  const footer = stage === 'done'
    ? <button className="btn" onClick={() => onClose?.()}>Done</button>
    : stage === 'error'
      ? <><button className="btn secondary" onClick={() => onClose?.()}>Close</button>
          {startError?.stale
            ? <button className="btn" onClick={() => window.location.reload()}>Reload page</button>
            : <button className="btn" onClick={() => setAttempt(a => a + 1)}>Try again</button>}</>
      : <><button className="btn secondary" onClick={closeCheckout} disabled={!!busy||cryptoBusy}>{busy==='cancel'?'Canceling…':pendingOrder&&!pendingOrder.cancelable?'Close checkout':'Cancel checkout'}</button>
          {session?.stripeEnabled === true && <button className="btn pay-cta" onClick={pay} disabled={!canPay}>
            {busy === 'pay' ? <><span className="spinner" /> Processing…</> : <>Pay ${amount}{session?.interval === 'year' ? '/yr' : '/mo'}</>}</button>}</>;

  return <SlideOver
    title={stage === 'done' ? 'Payment complete' : stage === 'error' ? 'Checkout did not start' : 'Secure checkout'}
    subtitle={stage === 'pay' && session?.stripeEnabled ? 'Your card is charged here, inside Emavanta.' : undefined}
    onClose={closeCheckout} footer={footer} width={470}>

    <div className="pay-steps" aria-hidden="true">
      {[['Order', stage === 'pay' || stage === 'done'], ['Payment', stage === 'done'], ['Receipt', !!receipt]]
        .map(([text, on], i) => <div key={text} className={`pay-step ${on ? 'on' : ''}`}>
          <span className="pay-step-dot">{on ? <Icon name="check" size={10} /> : i + 1}</span>{text}</div>)}
    </div>

    {stage === 'loading' && <div className="pay-loading"><span className="spinner" />
      <p className="muted">Preparing your order…</p>
      <p className="muted" style={{ fontSize: 12 }}>Checking the price with the server — this takes a second.</p></div>}

    {stage === 'error' && <div className="pay-error">
      <div className="pay-error-icon"><Icon name={startError?.stale ? 'refresh' : 'close'} size={22} /></div>
      <h3>{startError?.stale ? 'The page needs a refresh' : 'We could not start the checkout'}</h3>
      <p className="muted">
        {startError?.offline
          ? 'The Emavanta API is not answering right now. Start it and choose “Try again”.'
          : startError?.stale
            ? 'Reload the page so it picks up the current server build, then open the checkout again. Nothing was charged.'
            : `${startError?.message || 'Something went wrong.'} Nothing was charged.`}
      </p>
    </div>}

    {stage === 'pay' && <>
      <div className="pay-summary">
        <div className="mini-row">
          <div><b>{label}</b>
            <div className="muted" style={{ fontSize: 12 }}>{showDescription}</div></div>
          <div className="pay-amount">${amount}<span className="muted" style={{ fontSize: 12 }}>/{(pendingOrder?.interval||session.interval) === 'year' ? 'yr' : 'mo'}</span></div>
        </div>
        <div className="pay-lines">
          <span>Subtotal</span><span>${amount}</span>
          <span>Tax</span><span>$0</span>
          <span className="pay-total">Total due today</span><span className="pay-total">${amount}</span>
        </div>
      </div>

      {failure && !session.stripeEnabled && <p className="notice warn" role="alert">{failure.message}</p>}
      {session.stripeEnabled && <>
      <div className="pay-section-label">Pay with</div>
      {savedList.length > 0 && <div className="pay-methods">
        {savedList.map(m => <label key={m._id}
          className={`pay-method ${useSaved === m._id ? 'active' : ''} ${m.usable === false ? 'disabled' : ''}`}>
          <input type="radio" name="pay-method" disabled={m.usable === false}
            checked={useSaved === m._id} onChange={() => setUseSaved(m._id)} />
          <span className="pay-method-brand"><Icon name="card" size={15} /></span>
          <span className="pay-method-body">
            <b>{m.brand?.replace(/^./, c => c.toUpperCase())} •••• {m.last4}</b>
            <span className="muted">{String(m.expMonth).padStart(2, '0')}/{String(m.expYear).slice(-2)}{m.name ? ` · ${m.name}` : ''}</span>
          </span>
          {m.usable === false
            ? <span className="badge danger">Cannot be charged</span>
            : m.isDefault ? <span className="badge ok">Default</span> : null}
        </label>)}
        <label className={`pay-method ${useSaved === 'new' ? 'active' : ''}`}>
          <input type="radio" name="pay-method" checked={useSaved === 'new'} onChange={() => setUseSaved('new')} />
          <span className="pay-method-brand alt"><Icon name="plus" size={15} /></span>
          <span className="pay-method-body"><b>Use a new card</b>
            <span className="muted">Nothing is saved until the payment succeeds.</span></span>
        </label>
      </div>}

      {payingNew && <div className="card-form" style={{ marginTop: 10 }}>
        <CardFields card={card} setCard={setCard} errors={errors} setErrors={setErrors} />
        <label className="check-row" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
          Save this card for next time (only the brand, last 4 digits and expiry are kept)
        </label>
      </div>}

      {failure && <div className={`notice ${failure.declined ? 'danger' : 'warn'}`} style={{ marginTop: 14 }}>
        <b>{failure.declined ? 'Card declined' : 'Payment did not go through'}</b>
        <div>{failure.message}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {failure.switched
            ? 'Nothing was charged. The new-card form is open below — enter a card and press Pay again.'
            : 'Nothing was charged. You can try another card.'}
        </div>
      </div>}

      {session.stripeTestMode && <div className="pay-note"><Icon name="shield" size={13} /><span>Stripe test mode — no real money moves.</span></div>}
      </>}
      {!cryptoStarted && <StripeCardCheckout sessionId={session.sessionId} kind={intent?.kind} onStarted={()=>setCardStarted(true)} onSettled={r=>{setReceipt({subscription:{plan:r.plan}});onPaid?.(r);}} />}
      {!cardStarted && <CryptoWalletNotice sessionId={session.sessionId} kind={intent?.kind} onStarted={()=>setCryptoStarted(true)} onBusy={setCryptoBusy} onPending={setPendingOrder} onCleared={()=>setCryptoStarted(false)} />}

    </>}

    {stage === 'done' && <div className="pay-done">
      <div className="pay-check"><Icon name="check" size={26} /></div>
      <h3>{receipt?.free ? 'You are on the Free plan' : 'Payment successful'}</h3>
      {receipt?.invoice && <p className="muted">
        {receipt.invoice.number} · ${receipt.invoice.amount} charged · {receipt.invoice.method}</p>}
      {receipt?.limits && <div className="pay-limits">
        {[['Sends', receipt.limits.sends], ['Contacts', receipt.limits.contacts], ['Mailboxes', receipt.limits.mailboxes], ['Seats', receipt.limits.seats]]
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => <div key={k}><span className="stat-label">{k}</span><b>{Number(v).toLocaleString()}</b></div>)}
      </div>}
      {receipt?.savedMethod && <div className="notice ok" style={{ marginTop: 14 }}>
        Card saved — next purchase is one click.</div>}
      {receipt?.subscription?.plan && <p className="muted" style={{ marginTop: 10 }}>
        Plan: <b>{receipt.subscription.plan}</b> · updated immediately.</p>}
    </div>}
  </SlideOver>;
}

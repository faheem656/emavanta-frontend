'use client';
import Icon from './Icon';

/* Shared card-input behaviour: the same formatting and checks are used by the
   checkout dialog and by "add a card" in the billing page, so a card that is
   accepted while paying is accepted while saving (and vice versa). */

export const digits = v => String(v || '').replace(/\D/g, '');
export const groups = v => digits(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

export const brandOf = number => {
  const d = digits(number);
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  return '';
};

export const luhnOk = number => {
  const d = digits(number);
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0, double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n; double = !double;
  }
  return sum % 10 === 0;
};

/** All problems at once, so every field can point at itself. */
/**
 * Client-side card check. It mirrors `validateCard()` in
 * `packages/entitlements/payments.js` rule for rule, so the browser catches exactly
 * what the server would and the user never gets a mystery 422 after pressing Pay.
 */
export const validateCardFields = card => {
  const next = {};
  const digits = String(card.number || '').replace(/\D/g, '');
  if (!digits) next.number = 'Enter the card number.';
  else if (!luhnOk(digits)) next.number = 'That card number is not valid — check the digits.';
  else if (brandOf(digits) === 'amex' ? digits.length !== 15 : digits.length !== 16)
    next.number = `A ${brandOf(digits)} card has ${brandOf(digits) === 'amex' ? 15 : 16} digits.`;

  const raw = String(card.expiry || '').trim();
  const [mm, yy] = raw.split('/');
  const month = Number(mm), year = Number(yy);
  if (!raw) next.expiry = 'Enter the expiry as MM/YY.';
  else if (!/^\d{1,2}$/.test(mm || '') || month < 1 || month > 12) next.expiry = 'Use MM/YY — e.g. 07/29.';
  else if (!/^\d{2}(\d{2})?$/.test(yy || '')) next.expiry = 'Use MM/YY — e.g. 07/29.';
  else {
    const fullYear = year < 100 ? 2000 + year : year;
    if (new Date(fullYear, month, 1) <= new Date()) next.expiry = 'That card has expired.';
  }

  const cvc = String(card.cvc || '').replace(/\D/g, '');
  const need = brandOf(digits) === 'amex' ? 4 : 3;
  if (!cvc) next.cvc = 'Enter the CVC.';
  else if (cvc.length !== need) next.cvc = `The CVC is ${need} digits on this card.`;

  if (!String(card.name || '').trim()) next.name = 'Enter the name printed on the card.';
  return next;
};

/**
 * Turns an API error's `details.fields` into `{ field: message }`.
 * The API sends an object today, but a list of `{ path, message }` is accepted too,
 * so a shape change can never throw inside a catch block again.
 */
export const fieldErrorsFrom = details => {
  const out = {};
  const fields = details?.fields;
  if (!fields) return out;
  if (Array.isArray(fields)) {
    for (const f of fields) {
      if (!f) continue;
      const key = String(f.path || f.field || '').split('.').pop();
      if (key) out[key] = f.message || 'Check this field.';
    }
  } else if (typeof fields === 'object') {
    for (const [key, value] of Object.entries(fields)) {
      out[String(key).split('.').pop()] = typeof value === 'string' ? value : 'Check this field.';
    }
  }
  return out;
};

export default function CardFields({ card, setCard, errors = {}, setErrors }) {
  const clear = key => setErrors?.(prev => ({ ...prev, [key]: undefined }));
  const brand = brandOf(card.number);
  const bad = key => (errors[key] ? 'invalid' : '');
  return <>
    <div data-card-field="name">
      <label>Name on card</label>
      <input autoComplete="cc-name" value={card.name} placeholder="Name on card" className={bad('name')}
        onChange={e => { setCard({ ...card, name: e.target.value }); clear('name'); }} />
      {errors.name && <span className="field-error">{errors.name}</span>}
    </div>

    <div data-card-field="number" style={{ marginTop: 10 }}>
      <label>Card number</label>
      <div className={`card-input ${bad('number')}`}>
        <input inputMode="numeric" autoComplete="cc-number" value={card.number}
          placeholder="4242 4242 4242 4242" className={bad('number')}
          onChange={e => { setCard({ ...card, number: groups(e.target.value) }); clear('number'); }} />
        <span className={`card-brand ${brand ? 'on' : ''}`}>{brand || <Icon name="card" size={18} />}</span>
      </div>
      {errors.number && <span className="field-error">{errors.number}</span>}
    </div>

    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
      <div data-card-field="expiry">
        <label>Expiry</label>
        <input inputMode="numeric" autoComplete="cc-exp" value={card.expiry} placeholder="MM/YY"
          className={bad('expiry')}
          onChange={e => {
            let v = digits(e.target.value).slice(0, 4);
            if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
            setCard({ ...card, expiry: v });
            clear('expiry');
          }} />
        {errors.expiry && <span className="field-error">{errors.expiry}</span>}
      </div>
      <div data-card-field="cvc">
        <label>CVC</label>
        <input inputMode="numeric" autoComplete="cc-csc" value={card.cvc} placeholder="123"
          className={bad('cvc')}
          onChange={e => { setCard({ ...card, cvc: digits(e.target.value).slice(0, 4) }); clear('cvc'); }} />
        {errors.cvc && <span className="field-error">{errors.cvc}</span>}
      </div>
    </div>
  </>;
}

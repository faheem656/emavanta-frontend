// Shared plan catalogue for instant, offline-safe rendering.
// The source of truth is backend/packages/entitlements/definitions.js — the same file the API uses.
import { PLANS, ADDONS, annualPrice } from './shared/entitlements/definitions.js';

export const FALLBACK_PLANS = Object.entries(PLANS).map(([code, p]) => ({
  code,
  name: p.name,
  monthly: p.priceMonthly,
  yearly: annualPrice(code),
  limits: p.limits
}));

export const FALLBACK_ADDONS = Object.values(ADDONS).map(a => ({ ...a }));

export const FALLBACK_PAYLOAD = {
  currency: 'usd',
  plans: FALLBACK_PLANS,
  addons: FALLBACK_ADDONS
};

export const fmtLimit = n => (n < 0 ? 'Unlimited' : Number(n).toLocaleString('en-US'));

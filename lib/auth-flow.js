import { FALLBACK_PLANS } from './plans.js';

const APP_ORIGIN = 'https://auth.local';

function paramsFrom(search = '') {
  return search instanceof URLSearchParams
    ? search
    : new URLSearchParams(String(search).replace(/^\?/, ''));
}

export function readPlanSelection(search = '') {
  const params = paramsFrom(search);
  const plan = FALLBACK_PLANS.find(item => item.code === params.get('plan'));
  if (!plan) return null;
  const interval = params.get('interval') === 'annual' ? 'annual' : 'monthly';
  return { ...plan, interval };
}

export function billingPathForPlan(plan, interval = 'monthly') {
  if (!plan || plan === 'free' || !FALLBACK_PLANS.some(item => item.code === plan)) return '/dashboard';
  const params = new URLSearchParams({ plan, interval: interval === 'annual' ? 'annual' : 'monthly' });
  return `/dashboard/billing?${params.toString()}`;
}

function safeInternalPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  try {
    const url = new URL(value, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function authDestination(search = '') {
  const params = paramsFrom(search);
  const next = safeInternalPath(params.get('next'));
  if (next) return next;
  const selection = readPlanSelection(params);
  return selection ? billingPathForPlan(selection.code, selection.interval) : '/dashboard';
}

export function signInHrefFor(search = '') {
  const destination = authDestination(search);
  if (destination === '/dashboard') return '/signin';
  const params = new URLSearchParams({ next: destination });
  return `/signin?${params.toString()}`;
}

export function signupHrefForPlan(plan, interval = 'monthly') {
  if (!FALLBACK_PLANS.some(item => item.code === plan)) return '/signup';
  const params = new URLSearchParams({ plan, interval: interval === 'annual' ? 'annual' : 'monthly' });
  return `/signup?${params.toString()}`;
}

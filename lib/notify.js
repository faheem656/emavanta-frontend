/**
 * One place that turns backend errors into human messages with a next action.
 * Keeps users inside the flow instead of dumping a raw stack trace on them.
 */
const RULES = [
  { test: /seat limit|seat[s]? (are|is) full|seat limit reached/i, level: 'warn',
    title: 'Seat limit reached',
    actions: [{ label: 'Buy +5 seats ($15/mo)', href: '/dashboard/billing?addon=seats5' },
      { label: 'Compare plans', href: '/pricing' }] },
  { test: /quota|plan limit|limit reached|upgrade/i, level: 'warn',
    title: 'You have hit a plan limit',
    actions: [{ label: 'View plans', href: '/dashboard/billing' }] },
  { test: /permission|not allowed|forbidden|owner|admin only/i, level: 'error',
    title: 'Needs a higher role' },
  { test: /unauthori[sz]ed|session expired|invalid token|jwt/i, level: 'error',
    title: 'Session expired',
    actions: [{ label: 'Sign in again', href: '/signin' }] },
  { test: /cannot reach|not reachable|econnrefused|failed to fetch|networkerror|load failed/i, level: 'error',
    title: 'Backend not running',
    actions: [{ label: 'Setup guide', href: '/status' }] }
];

export function describeError(err){
  if (err?.offline) return { title: 'Backend not running', level: 'error', message: err.message,
    actions: [{ label: 'Retry', href: null }, { label: 'Setup guide', href: '/status' }] };
  const message = typeof err === 'string' ? err : (err?.message || 'Something went wrong');
  const rule = RULES.find(r => r.test.test(message));
  if (!rule) return { message, level: 'error' };
  return {
    title: rule.title,
    message: message.replace(/^\w/, c => c.toUpperCase()),
    level: rule.level,
    actions: (rule.actions || []).filter(a => a.href || a.onRetry)
  };
}

export function notify(toast, err, extra = {}){
  toast({ ...describeError(err), ...extra });
}

/** A friendly fallback message for anything the API could not explain. */
export const explain = err => describeError(err).message;

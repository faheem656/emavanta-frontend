/** Single source of truth for plans, prices (USD) and quota dimensions. */
export const PLANS = Object.freeze({
  free: { name: 'Free', priceMonthly: 0, limits: { seats: 1, mailboxes: 1, contacts: 100, sends: 500, sequences: 1, client_workspaces: 0, campaigns: 1, automations: 0, ai_credits: 0, api_calls: 100, verification_credits: 0 } },
  launch: { name: 'Launch', priceMonthly: 19, limits: { seats: 3, mailboxes: 3, contacts: 2000, sends: 5000, sequences: 5, client_workspaces: 0, campaigns: 25, automations: 3, ai_credits: 2000, api_calls: 1000, verification_credits: 0 } },
  growth: { name: 'Growth', priceMonthly: 49, limits: { seats: 10, mailboxes: 10, contacts: 15000, sends: 30000, sequences: 25, client_workspaces: 2, campaigns: 200, automations: 25, ai_credits: 10000, api_calls: 5000, verification_credits: 0 } },
  scale: { name: 'Scale', priceMonthly: 99, limits: { seats: 25, mailboxes: 30, contacts: 50000, sends: 150000, sequences: -1, client_workspaces: 10, campaigns: -1, automations: -1, ai_credits: 50000, api_calls: 20000, verification_credits: 0 } },
  business: { name: 'Business', priceMonthly: 249, limits: { seats: -1, mailboxes: 100, contacts: 150000, sends: 500000, sequences: -1, client_workspaces: 50, campaigns: -1, automations: -1, ai_credits: 200000, api_calls: 100000, verification_credits: 0 } }
});
export const ADDONS = Object.freeze({
  mailbox5: { code: 'mailbox5', label: '+5 mailboxes', dimension: 'mailboxes', amount: 5, price: 9 },
  mailbox20: { code: 'mailbox20', label: '+20 mailboxes', dimension: 'mailboxes', amount: 20, price: 29 },
  contacts10k: { code: 'contacts10k', label: '+10,000 contacts', dimension: 'contacts', amount: 10000, price: 10 },
  sends25k: { code: 'sends25k', label: '+25,000 sends', dimension: 'sends', amount: 25000, price: 7 },
  sends100k: { code: 'sends100k', label: '+100,000 sends', dimension: 'sends', amount: 100000, price: 19 },
  seats5: { code: 'seats5', label: '+5 team seats', dimension: 'seats', amount: 5, price: 15 },
  clients5: { code: 'clients5', label: '+5 client workspaces', dimension: 'client_workspaces', amount: 5, price: 29 },
  ai50k: { code: 'ai50k', label: '+50,000 AI credits', dimension: 'ai_credits', amount: 50000, price: 9 },
  // Verification credit PACKS: one-time purchase, never expire (granted as a
  // lifetime balance on org.verifyCredits — NOT a monthly dimension refresh).
  verify2k: { code: 'verify2k', label: '2,000 verification credits', dimension: 'verification_credits', amount: 2000, price: 19, grants: 'verifyCredits', oneTime: true },
  verify5k: { code: 'verify5k', label: '5,000 verification credits', dimension: 'verification_credits', amount: 5000, price: 29, grants: 'verifyCredits', oneTime: true },
  verify10k: { code: 'verify10k', label: '10,000 verification credits', dimension: 'verification_credits', amount: 10000, price: 49, grants: 'verifyCredits', oneTime: true },
  verify25k: { code: 'verify25k', label: '25,000 verification credits', dimension: 'verification_credits', amount: 25000, price: 119, grants: 'verifyCredits', oneTime: true },
  verify50k: { code: 'verify50k', label: '50,000 verification credits', dimension: 'verification_credits', amount: 50000, price: 229, grants: 'verifyCredits', oneTime: true },
  verify100k: { code: 'verify100k', label: '100,000 verification credits', dimension: 'verification_credits', amount: 100000, price: 399, grants: 'verifyCredits', oneTime: true },
  verify250k: { code: 'verify250k', label: '250,000 verification credits', dimension: 'verification_credits', amount: 250000, price: 899, grants: 'verifyCredits', oneTime: true },
  verify500k: { code: 'verify500k', label: '500,000 verification credits', dimension: 'verification_credits', amount: 500000, price: 1599, grants: 'verifyCredits', oneTime: true },
  verify1m: { code: 'verify1m', label: '1,000,000 verification credits', dimension: 'verification_credits', amount: 1000000, price: 2999, grants: 'verifyCredits', oneTime: true },
  events100k: { code: 'events100k', label: '+100,000 tracking events', dimension: 'tracking_events', amount: 100000, price: 5 },
  storage100: { code: 'storage100', label: '+100 GB storage', dimension: 'storage_gb', amount: 100, price: 9 },
  api: { code: 'api', label: '+API tier', dimension: 'api_tier', amount: 1, price: 19 },
  support: { code: 'support', label: '+Priority support', dimension: 'support', amount: 1, price: 39 }
});
export const annualPrice = plan => Math.round(PLANS[plan].priceMonthly * 10);
export const limitFor = (plan, dimension, addons = {}) => {
  const base = PLANS[plan]?.limits?.[dimension] ?? 0;
  const extra = Object.entries(addons).reduce((sum, [code, qty]) => sum + ((ADDONS[code]?.dimension === dimension ? ADDONS[code].amount : 0) * qty), 0);
  return base < 0 ? -1 : base + extra;
};

// Purchased crypto add-ons are tracked separately from legacy/manual add-ons.
export const effectiveAddons = org => {
  const merged={...(org?.addons||{})};
  for(const [code,qty] of Object.entries(org?.cryptoAddons||{})) {
    const amount=Number(qty);if(Number.isFinite(amount)&&amount>0)merged[code]=(Number(merged[code])||0)+amount;
  }
  return merged;
};

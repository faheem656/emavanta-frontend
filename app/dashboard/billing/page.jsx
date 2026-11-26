
'use client';

import { useEffect, useState } from 'react';
import { get, post } from '../../../lib/api';
import PlanCards from '../../../components/PlanCards';
import CheckoutPanel from '../../../components/CheckoutPanel';
import PaymentMethods from '../../../components/PaymentMethods';
import PageHead from '../../../components/PageHead';
import DashboardSkeleton from '../../../components/DashboardSkeleton';
import Icon from '../../../components/Icon';
import { useToast } from '../../../components/ToastProvider';

/* -------------------------------------------------------
   DATE HELPERS
------------------------------------------------------- */

const dateLabel = value => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

const addCalendarMonths = (date, months) => {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  // Move to the first day before changing the month.
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  // Prevent overflow for dates such as January 31.
  const lastDay = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDay));

  return result;
};

const getBillingInterval = interval => {
  const value = String(interval || '').toLowerCase();

  if (['month', 'monthly'].includes(value)) {
    return 'monthly';
  }

  if (['year', 'yearly', 'annual', 'annually'].includes(value)) {
    return 'annual';
  }

  return null;
};

/*
  Subscription end date:
  Monthly = startedAt + 1 calendar month
  Annual  = startedAt + 12 calendar months

  Existing expiresAt is used as a fallback when
  the start date or interval is unavailable.
*/

const getPlanEndDate = subscription => {
  if (!subscription || subscription.plan === 'free') {
    return null;
  }

  const startedAt = subscription.startedAt
    ? new Date(subscription.startedAt)
    : null;

  const interval = getBillingInterval(subscription.interval);

  if (
    startedAt &&
    Number.isFinite(startedAt.getTime()) &&
    interval === 'monthly'
  ) {
    return addCalendarMonths(startedAt, 1);
  }

  if (
    startedAt &&
    Number.isFinite(startedAt.getTime()) &&
    interval === 'annual'
  ) {
    return addCalendarMonths(startedAt, 12);
  }

  return subscription.expiresAt || null;
};

const fmt = number => {
  return Number(number) < 0
    ? 'Unlimited'
    : Number(number || 0).toLocaleString();
};

/* -------------------------------------------------------
   BILLING PAGE
------------------------------------------------------- */

export default function Billing() {
  const toast = useToast();

  const [usage, setUsage] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [invoices, setInvoices] = useState([]);

  const [sub, setSub] = useState(null);
  const [cryptoHistory, setCryptoHistory] = useState([]);

  const [addonLabels, setAddonLabels] = useState({});
  const [cancelBusy, setCancelBusy] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [intent, setIntent] = useState(null);
  const [loaded, setLoaded] = useState(false);

  /* -----------------------------------------------------
     LOAD BILLING DATA
  ----------------------------------------------------- */

  const load = () => {
    Promise.allSettled([
      get('/billing/usage')
        .then(setUsage),

      get('/billing/alerts')
        .then(setAlerts),

      get('/billing/crypto/history')
        .then(response => {
          setCryptoHistory(
            Array.isArray(response) ? response : []
          );
        }),

      get('/billing/invoices')
        .then(response => {
          setInvoices(
            Array.isArray(response) ? response : []
          );
        }),

      get('/billing/subscription')
        .then(response => {
          if (response && !Array.isArray(response)) {
            setSub(response);
          }
        }),

      get('/billing/plans')
        .then(response => {
          const map = {};

          for (const [code, addon] of Object.entries(
            response?.addons || {}
          )) {
            map[code] = addon.label || code;
          }

          setAddonLabels(map);
        })
    ]).then(() => setLoaded(true));
  };

  /* -----------------------------------------------------
     INITIAL LOAD AND CHECKOUT DEEP LINKS
  ----------------------------------------------------- */

  useEffect(() => {
    load();

    const query =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null;

    const addon = query?.get('addon');
    const plan = query?.get('plan');

    if (addon === 'seats5') {
      setIntent({
        kind: 'addon',
        code: 'seats5',
        quantity: 1,
        amount: 15,
        label: '+5 team seats · $15/mo'
      });
    } else if (addon) {
      setIntent({
        kind: 'addon',
        code: addon,
        quantity: 1
      });
    } else if (plan) {
      setIntent({
        kind: 'plan',
        plan,
        interval: query.get('interval') || 'monthly'
      });
    }

    const legacy =
      query?.get('mock_checkout') ||
      query?.get('checkout_plan');

    if (legacy) {
      setIntent({
        kind: 'plan',
        plan: legacy,
        interval: query.get('interval') || 'monthly'
      });
    } else if (query?.get('checkout') === '1') {
      document
        .getElementById('plans')
        ?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  /* -----------------------------------------------------
     CRYPTO PAYMENT CANCELLATION REQUEST
  ----------------------------------------------------- */

  async function requestCancel(payment) {
    if (!payment.orderId || cancelBusy) {
      return;
    }

    const confirmed = window.confirm(
      'Request cancellation? This does not reverse or refund a transfer. The owner must investigate before the order is closed.'
    );

    if (!confirmed) {
      return;
    }

    setCancelBusy(payment.orderId);
    setCancelError('');

    try {
      await post(
        `/billing/crypto/${encodeURIComponent(payment.orderId)}/request-cancellation`,
        {}
      );

      toast(
        'Cancellation requested. Do not send another payment.'
      );

      load();
    } catch (error) {
      setCancelError(error.message);
    } finally {
      setCancelBusy('');
    }
  }

  /* -----------------------------------------------------
     DERIVED SUBSCRIPTION DATA
  ----------------------------------------------------- */

  const pct = alerts?.pct || 0;
  const limits = sub?.limits || {};
  const seats = limits.seats;

  const billingInterval = getBillingInterval(sub?.interval);

  const planEndDate = getPlanEndDate(sub);

  const billingTerm =
    sub?.plan === 'free'
      ? 'Free'
      : billingInterval === 'monthly'
        ? 'Monthly'
        : billingInterval === 'annual'
          ? 'Annual'
          : 'Not available';

  const isFreePlan = sub?.plan === 'free';

  const isManualOverride =
    sub?.source === 'platform_manual_override';

  const hasCalculatedEndDate =
    !isFreePlan && !!planEndDate;

  /* -----------------------------------------------------
     RENDER
  ----------------------------------------------------- */

  if (!loaded) return <DashboardSkeleton variant="overview" />;

  return (
    <>
      <PageHead
        title="Billing"
        subtitle="USD plans, usage and add-ons"
        actions={
          <button
            className="btn ghost sm"
            onClick={load}
          >
            <Icon name="refresh" size={14} />
            Refresh
          </button>
        }
      />

      {/* CURRENT SUBSCRIPTION */}

      <section
        className="billing-plan-summary"
        aria-label="Current plan details"
      >
        <div className="billing-plan-title">
          <div>
            <span className="billing-kicker">
              YOUR SUBSCRIPTION
            </span>

            <h2>
              {sub
                ? `${(sub.plan || 'free')
                    .charAt(0)
                    .toUpperCase()}${(sub.plan || 'free').slice(1)} plan`
                : 'Loading plan…'}
            </h2>

            <p>
              {isManualOverride
                ? 'crypto'
                : isFreePlan
                  ? 'Free workspace plan'
                  : sub?.source === 'crypto'
                    ? 'USDT prepaid term'
                    : sub?.source === 'stripe'
                      ? 'Card prepaid term'
                      : 'Plan term'}
            </p>
          </div>

          <span className="billing-status">
            {sub ? 'Current plan' : 'Loading'}
          </span>
        </div>

        {/* SUBSCRIPTION DATES */}

        <div className="billing-dates">
          <div>
            <span>Started</span>

            <strong>
              {dateLabel(sub?.startedAt)}
            </strong>
          </div>

          <div>
            <span>
              {isFreePlan ? 'Plan end' : 'Term ends'}
            </span>

            <strong>
              {isFreePlan
                ? 'No expiry'
                : dateLabel(planEndDate)}
            </strong>
          </div>

          <div>
            <span>Billing term</span>

            <strong>{billingTerm}</strong>
          </div>

          <div>
            <span>Renewal</span>

            <strong>No automatic renewal</strong>
          </div>
        </div>

        {/* PREVIOUS TERM */}

        {sub?.previousTermEnd && (
          <p className="billing-footnote">
            Previous paid term ended{' '}
            {dateLabel(sub.previousTermEnd)}.
            Your workspace is now on Free.
          </p>
        )}

        {/* MANUAL PLAN INFORMATION */}

        {/* {isManualOverride && (
          <p className="billing-footnote">
            Manually assigned term. No payment was
            recorded here and no automatic renewal
            is scheduled.

            {!sub?.expiresAt &&
              ' This older manual plan has no recorded end date; ask the owner to set a term.'}
          </p>
        )} */}

        {/* MISSING END DATE */}

        {!isFreePlan &&
          !isManualOverride &&
          !hasCalculatedEndDate && (
            <p className="billing-footnote">
              The end date could not be calculated
              because the starting date or billing
              interval is unavailable. Contact
              support for confirmation.
            </p>
          )}
      </section>

      {/* USAGE AND INVOICES */}

      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'start'
        }}
      >
        {/* CURRENT USAGE */}

        <div className="card">
          <h2>Current usage</h2>

          <div className="mini-row">
            <b style={{ textTransform: 'capitalize' }}>
              {alerts?.level || 'ok'}
            </b>

            <span className="muted">
              {pct}% of send capacity
            </span>
          </div>

          <div
            className="progress ok"
            style={{
              height: 12,
              marginTop: 10
            }}
          >
            <i
              style={{
                width: `${Math.min(100, pct)}%`
              }}
            />
          </div>

          <div
            className="grid"
            style={{ marginTop: 16 }}
          >
            {['sends', 'contacts', 'seats'].map(key => (
              <div key={key}>
                <div className="stat-label">
                  {key}
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700
                  }}
                >
                  {usage?.used?.[key] || 0}

                  <span
                    className="muted"
                    style={{
                      fontSize: 12,
                      fontWeight: 500
                    }}
                  >
                    {' / '}
                    {fmt(limits[key])}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p
            className="muted"
            style={{
              marginTop: 12,
              fontSize: 12
            }}
          >
            Plan{' '}

            <b style={{ textTransform: 'capitalize' }}>
              {sub?.plan || 'free'}
            </b>

            {Object.keys(sub?.addons || {}).length
              ? ` · ${Object.entries(sub.addons)
                  .map(([key, value]) =>
                    `${addonLabels[key] || key}${
                      value > 1 ? ` ×${value}` : ''
                    }`
                  )
                  .join(', ')}`
              : ''}

            {seats !== undefined
              ? ` · ${
                  seats < 0 ? 'unlimited' : seats
                } seats`
              : ''}
          </p>
        </div>

        {/* INVOICES */}

        <div className="card">
          <div className="mini-row">
            <h2 style={{ margin: 0 }}>
              Invoices
            </h2>

            {invoices.length > 5 && (
              <button
                className="btn ghost sm"
                onClick={() =>
                  setShowAllInvoices(value => !value)
                }
              >
                {showAllInvoices
                  ? 'Show latest 5'
                  : `Show all ${invoices.length}`}
              </button>
            )}
          </div>

          {(showAllInvoices
            ? invoices
            : invoices.slice(0, 5)
          ).map(invoice => (
            <div
              className="block"
              key={invoice._id}
            >
              <div className="mini-row">
                <b>{invoice.number}</b>

                <span>
                  ${invoice.amount}{' '}
                  {invoice.currency?.toUpperCase?.() || 'USD'}
                </span>
              </div>

              <div
                className="muted"
                style={{ fontSize: 12 }}
              >
                {invoice.date} · {invoice.status}

                {invoice.method
                  ? ` · ${invoice.method}`
                  : ''}
              </div>
            </div>
          ))}

          {!invoices.length && (
            <p className="muted">
              Invoices appear here after a payment.
              Nothing is charged automatically.
            </p>
          )}
        </div>
      </div>

      {/* USDT PAYMENT HISTORY */}

      <div
        className="card"
        style={{ marginTop: 18 }}
      >
        <h2>USDT payment status</h2>

        <p className="muted">
          Each USDT term is a one-time payment.
          The customer approves a new transfer for
          another term; it is not an automatic
          recurring charge. Owner review can take
          longer than expected. A submitted transfer
          cannot be reversed here.
        </p>

        {cancelError && (
          <p
            className="notice warn"
            role="alert"
          >
            {cancelError}
          </p>
        )}

        {cryptoHistory.length ? (
          cryptoHistory.map(payment => (
            <div
              className="block"
              key={payment.txHash}
            >
              <b>
                {payment.kind === 'addon'
                  ? `${payment.code} × ${payment.quantity}`
                  : payment.plan}

                {' · '}
                {payment.amount} USDT
                {' · '}
                {payment.status}
              </b>

              <div style={{ overflowWrap: 'anywhere' }}>
                {payment.txHash}
              </div>

              {payment.expiresAt && (
                <div>
                  Term expires{' '}
                  {dateLabel(payment.expiresAt)}
                </div>
              )}

              {payment.cancelRequestedAt ? (
                <p>
                  Cancellation requested;
                  awaiting owner review.
                </p>
              ) : payment.status === 'pending' ? (
                <button
                  className="btn secondary sm"
                  disabled={!!cancelBusy}
                  onClick={() => requestCancel(payment)}
                >
                  {cancelBusy === payment.orderId
                    ? 'Requesting...'
                    : 'Request cancellation'}
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p>No submitted USDT payments.</p>
        )}
      </div>

      {/* PAYMENT METHODS */}

      {sub?.stripeEnabled === true && (
        <div style={{ marginTop: 18 }}>
          <PaymentMethods onChanged={load} />
        </div>
      )}

      {/* AVAILABLE PLANS */}

      <div
        id="plans"
        style={{ marginTop: 18 }}
      >
        <PlanCards onChanged={load} />
      </div>

      {/* CHECKOUT */}

      <CheckoutPanel
        intent={intent}
        onClose={() => setIntent(null)}
        onPaid={() => load()}
        onSubmitted={() => load()}
      />
    </>
  );
}

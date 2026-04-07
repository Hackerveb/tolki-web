'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { api } from '@/convex/_generated/api';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="15 18 9 12 15 6"
      stroke="var(--color-text-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
      stroke="var(--color-text-tertiary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  active: 'Active',
  enterprise: 'Enterprise',
};

const STATUS_BG: Record<string, string> = {
  active: 'var(--color-success)',
  trialing: 'var(--color-info)',
  past_due: 'var(--color-warning)',
  canceled: 'var(--color-error)',
};

const STATUS_I18N_KEYS: Record<string, 'billing.statusActive' | 'billing.statusTrialing' | 'billing.statusPastDue' | 'billing.statusCanceled'> = {
  active: 'billing.statusActive',
  trialing: 'billing.statusTrialing',
  past_due: 'billing.statusPastDue',
  canceled: 'billing.statusCanceled',
};

const TX_BG: Record<string, string> = {
  completed: 'var(--color-success)',
  pending: 'var(--color-warning)',
  failed: 'var(--color-error)',
};

function formatDate(ts: number, dateLocale: string) {
  return new Date(ts).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Subscription success handler ─────────────────────────────────────────────

function SubscribedHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get('subscribed')) {
      // Give Stripe webhook a moment, then clean the URL
      const timer = setTimeout(() => router.replace('/settings/billing'), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);
  return null;
}

// ─── Minutes Usage Bar ─────────────────────────────────────────────────────────

function MinutesUsageBar({
  used,
  total,
  rollover,
  tt,
}: {
  used: number;
  total: number;
  rollover: number;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
}) {
  const included = total - rollover;
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isOverage = used > total;

  return (
    <div>
      {/* Bar */}
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          backgroundColor: 'var(--color-neutral-200)',
          overflow: 'hidden',
          marginBottom: '8px',
        }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={tt('billing.progressLabel', { pct: String(Math.round(pct)) })}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: '4px',
            background: isOverage
              ? 'var(--color-error)'
              : isNearLimit
              ? 'var(--color-warning)'
              : 'linear-gradient(90deg, var(--color-primary), #4F46E5)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {tt('billing.minutesProgress', { used: String(Math.round(used)), total: String(Math.round(total)) })}
        </span>
        {rollover > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {tt('billing.rolloverIncluded', { n: String(Math.round(rollover)) })}
          </span>
        )}
      </div>

      {included > 0 && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
          {tt('billing.includedPerCycle', { n: String(Math.round(included)) })}
        </p>
      )}
    </div>
  );
}

// ─── Credit purchase history ────────────────────────────────────────────────────

interface CreditPurchase {
  id: string;
  date: number;
  amount: number;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

function TransactionItem({
  transaction,
  tt,
  dateLocale,
}: {
  transaction: CreditPurchase;
  tt: ReturnType<typeof useT>;
  dateLocale: string;
}) {
  const txLabels: Record<string, string> = {
    completed: tt('billing.txCompleted'),
    pending: tt('billing.txPending'),
    failed: tt('billing.txFailed'),
  };
  const bg = TX_BG[transaction.status] ?? TX_BG.completed;
  const label = txLabels[transaction.status] ?? transaction.status;
  const dateStr = new Date(transaction.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="glass" style={{ marginBottom: '12px', padding: '16px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {dateStr}
          </p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {transaction.description}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600 }}>
            +{transaction.credits} min
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '16px', gap: '8px' }}>
          <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {transaction.amount.toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
          </p>
          <div style={{ paddingTop: '3px', paddingBottom: '3px', paddingLeft: '10px', paddingRight: '10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, color: '#FFFFFF', backgroundColor: bg, letterSpacing: '0.3px' }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { locale } = useLocale();
  const tt = useT(locale);
  const dateLocale = locale === 'nb' ? 'nb-NO' : 'en-US';

  // User-level subscription
  const subscription = useQuery(
    api.subscriptions.getSubscriptionByUserId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  // Credit purchase history
  const purchases = useQuery(
    api.payments.getRecentPurchases,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  const isLoading = subscription === undefined || purchases === undefined;

  const transactions: CreditPurchase[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    purchases?.map((p: any) => ({
      id: p.id,
      date: p.date,
      amount: p.amount / 100, // convert from øre to NOK
      credits: p.credits,
      status: p.status as 'completed' | 'pending' | 'failed',
      description: p.description,
    })) ?? [];

  const handleManageSubscription = async () => {
    if (!subscription?.user?.stripeCustomerId) return;

    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeCustomerId: subscription.user.stripeCustomerId,
      }),
    });

    if (!res.ok) {
      alert(tt('billing.cannotOpenPortal'));
      return;
    }

    const { url } = await res.json();
    window.location.href = url;
  };

  const subStatusBg = subscription ? (STATUS_BG[subscription.status] ?? STATUS_BG.active) : null;
  const subStatusLabel = subscription
    ? (STATUS_I18N_KEYS[subscription.status] ? tt(STATUS_I18N_KEYS[subscription.status]) : subscription.status)
    : null;

  return (
    <div className="glass-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <SubscribedHandler />
      </Suspense>

      {/* Header */}
      <header
        className="flex items-center glass-strong"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: '1px solid var(--glass-border)',
          borderRadius: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
          aria-label={tt('settings.goBack')}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          {tt('billing.title')}
        </h1>
      </header>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          paddingTop: '20px',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 20px', gap: '16px' }}>
            <div
              className="animate-spin"
              style={{ width: '36px', height: '36px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }}
            />
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{tt('billing.loading')}</p>
          </div>
        ) : (
          <>
            {/* ── Subscription section ── */}
            {subscription ? (
              <>
                {/* Current plan card */}
                <div
                  className="glass"
                  style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                        {tt('billing.currentPlan')}
                      </p>
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {TIER_LABELS[subscription.tier] ?? subscription.tier}
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                        {subscription.billingInterval === 'monthly' ? tt('billing.monthlyBilling') : tt('billing.annualBilling')}
                      </p>
                    </div>
                    {subStatusBg && subStatusLabel && (
                      <div
                        style={{
                          paddingTop: '4px',
                          paddingBottom: '4px',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          borderRadius: '99px',
                          backgroundColor: subStatusBg,
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                        }}
                      >
                        {subStatusLabel}
                      </div>
                    )}
                  </div>

                  {/* Billing cycle */}
                  <div
                    className="glass-subtle"
                    style={{ padding: '12px 14px', borderRadius: '12px', marginBottom: '16px' }}
                  >
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {tt('billing.billingPeriod')}
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {formatDate(subscription.currentPeriodStart, dateLocale)} – {formatDate(subscription.currentPeriodEnd, dateLocale)}
                    </p>
                  </div>

                  {/* Minutes usage */}
                  <MinutesUsageBar
                    used={subscription.user.minutesUsedThisCycle}
                    total={subscription.user.totalMinutesAvailable}
                    rollover={subscription.user.rolloverMinutes}
                    tt={tt}
                  />

                  {/* Overage rate */}
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '10px' }}>
                    {tt('billing.overageRate', { rate: String(subscription.overageRateNok) })}
                  </p>
                </div>

                {/* Manage subscription button */}
                {subscription.user.stripeCustomerId && (
                  <button
                    onClick={handleManageSubscription}
                    className="glass w-full flex items-center justify-between transition-all active:scale-[0.98]"
                    style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {tt('billing.manageSubscription')}
                    </span>
                    <ExternalLinkIcon />
                  </button>
                )}

                {/* Upgrade / change plan */}
                <Link href="/subscribe" className="block">
                  <button
                    className="glass-subtle w-full flex items-center justify-between transition-all active:scale-[0.98]"
                    style={{ padding: '16px', borderRadius: '16px', marginBottom: '24px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-primary)' }}>
                      {tt('billing.changePlan')}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <polyline points="9 18 15 12 9 6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </Link>
              </>
            ) : (
              // No subscription yet
              <div
                className="glass"
                style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center', marginBottom: '20px' }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-primary-alpha)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    margin: '0 auto 16px',
                  }}
                >
                  📋
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  {tt('billing.noPlan')}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                  {tt('billing.startingFrom')}
                </p>
                <Link href="/subscribe">
                  <button
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '15px',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: 'var(--glass-glow-primary)',
                    }}
                  >
                    {tt('billing.viewPlans')}
                  </button>
                </Link>
              </div>
            )}

            {/* ── Credit purchase history ── */}
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {tt('billing.transactionHistory')}
            </h3>

            {transactions.length > 0 ? (
              transactions.map((t) => <TransactionItem key={t.id} transaction={t} tt={tt} dateLocale={dateLocale} />)
            ) : (
              <div
                className="glass"
                style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRadius: '20px', gap: '12px' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--color-primary-alpha)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                  💳
                </div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {tt('billing.noTransactions')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                  {tt('billing.purchaseHistoryHere')}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

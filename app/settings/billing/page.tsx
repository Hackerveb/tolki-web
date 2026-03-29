'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import Link from 'next/link';
import { api } from '@/convex/_generated/api';

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
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  enterprise: 'Enterprise',
};

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  active: { bg: 'var(--color-success)', label: 'Aktiv' },
  trialing: { bg: 'var(--color-info)', label: 'Prøveperiode' },
  past_due: { bg: 'var(--color-warning)', label: 'Forfalt' },
  canceled: { bg: 'var(--color-error)', label: 'Avsluttet' },
};

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateFromMs(ts: number) {
  return new Date(ts).toLocaleDateString('nb-NO', {
    month: 'short',
    day: 'numeric',
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
}: {
  used: number;
  total: number;
  rollover: number;
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
        aria-label={`${Math.round(pct)}% av minutter brukt`}
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
          {Math.round(used)} / {Math.round(total)} min brukt
        </span>
        {rollover > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            inkl. {Math.round(rollover)} min overført
          </span>
        )}
      </div>

      {included > 0 && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
          {Math.round(included)} inkluderte minutter per syklus
        </p>
      )}
    </div>
  );
}

// ─── Personal billing (credit purchase history) ────────────────────────────────

interface CreditPurchase {
  id: string;
  date: number;
  amount: number;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

const PURCHASE_STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  completed: { bg: 'var(--color-success)', label: 'Fullført' },
  pending: { bg: 'var(--color-warning)', label: 'Venter' },
  failed: { bg: 'var(--color-error)', label: 'Feilet' },
};

function TransactionItem({ transaction }: { transaction: CreditPurchase }) {
  const style = PURCHASE_STATUS_STYLES[transaction.status] ?? PURCHASE_STATUS_STYLES.completed;
  return (
    <div className="glass" style={{ marginBottom: '12px', padding: '16px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {formatDateFromMs(transaction.date)}
          </p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {transaction.description}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600 }}>
            +{transaction.credits} credits
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '16px', gap: '8px' }}>
          <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            ${transaction.amount.toFixed(2)}
          </p>
          <div style={{ paddingTop: '3px', paddingBottom: '3px', paddingLeft: '10px', paddingRight: '10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, color: '#FFFFFF', backgroundColor: style.bg, letterSpacing: '0.3px' }}>
            {style.label}
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
  const { organization } = useOrganization();

  // Org subscription
  const subscription = useQuery(
    api.subscriptions.getSubscriptionByClerkOrgId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );

  // Personal credit purchase history (for non-org users)
  const purchases = useQuery(
    api.payments.getRecentPurchases,
    user?.id && !organization?.id ? { clerkId: user.id } : 'skip'
  );

  const isOrgMode = !!organization?.id;
  const isLoading = isOrgMode ? subscription === undefined : purchases === undefined;

  const transactions: CreditPurchase[] =
    purchases?.map((p: any) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      credits: p.credits,
      status: p.status as 'completed' | 'pending' | 'failed',
      description: p.description,
    })) ?? [];

  const handleManageSubscription = async () => {
    if (!subscription?.org) return;
    // We need the Stripe customer ID from the org record — fetch via the org query
    const org = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // stripeCustomerId comes from the org record; use a placeholder if not set yet
        stripeCustomerId: (subscription as any).org?.stripeCustomerId ?? '',
      }),
    });

    if (!org.ok) {
      alert('Kunne ikke åpne faktureringsportalen. Prøv igjen.');
      return;
    }

    const { url } = await org.json();
    window.location.href = url;
  };

  const subStatus = subscription
    ? (STATUS_STYLES[subscription.status] ?? STATUS_STYLES.active)
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
          aria-label="Gå tilbake"
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          {isOrgMode ? 'Abonnement og fakturering' : 'Faktureringshistorikk'}
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
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Laster...</p>
          </div>
        ) : isOrgMode ? (
          // ── Org subscription view ──────────────────────────────────────────
          <>
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
                        Gjeldende plan
                      </p>
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {TIER_LABELS[subscription.tier] ?? subscription.tier}
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                        {subscription.billingInterval === 'monthly' ? 'Månedlig fakturering' : 'Årlig fakturering'}
                      </p>
                    </div>
                    {subStatus && (
                      <div
                        style={{
                          paddingTop: '4px',
                          paddingBottom: '4px',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          borderRadius: '99px',
                          backgroundColor: subStatus.bg,
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                        }}
                      >
                        {subStatus.label}
                      </div>
                    )}
                  </div>

                  {/* Billing cycle */}
                  <div
                    className="glass-subtle"
                    style={{ padding: '12px 14px', borderRadius: '12px', marginBottom: '16px' }}
                  >
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Faktureringsperiode
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {formatDate(subscription.currentPeriodStart)} – {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>

                  {/* Minutes usage */}
                  <MinutesUsageBar
                    used={subscription.org.minutesUsedThisCycle}
                    total={subscription.org.totalMinutesAvailable}
                    rollover={subscription.org.rolloverMinutes}
                  />

                  {/* Overage rate */}
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '10px' }}>
                    Overskridelsespris: {subscription.overageRateNok} kr/min
                  </p>
                </div>

                {/* Manage subscription button */}
                <button
                  onClick={handleManageSubscription}
                  className="glass w-full flex items-center justify-between transition-all active:scale-[0.98]"
                  style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Administrer abonnement
                  </span>
                  <ExternalLinkIcon />
                </button>

                {/* Upgrade / change plan */}
                <Link href="/subscribe" className="block">
                  <button
                    className="glass-subtle w-full flex items-center justify-between transition-all active:scale-[0.98]"
                    style={{ padding: '16px', borderRadius: '16px', marginBottom: '24px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-primary)' }}>
                      Endre plan
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
                  Ingen aktiv abonnementsplan
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                  Fra 190 kr/mnd. Ingen bestilling. Ingen ventetid.
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
                    Se abonnementsplaner
                  </button>
                </Link>
              </div>
            )}
          </>
        ) : (
          // ── Personal credit purchase history ───────────────────────────────
          <>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Transaksjonshistorikk
            </h3>

            {transactions.length > 0 ? (
              transactions.map((t) => <TransactionItem key={t.id} transaction={t} />)
            ) : (
              <div
                className="glass"
                style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRadius: '20px', gap: '12px' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--color-primary-alpha)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                  💳
                </div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Ingen transaksjoner ennå
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                  Kjøpshistorikken din vises her.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

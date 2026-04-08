'use client';

import React, { useState, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'motion/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
import { useUserTier } from '@/hooks/useUserTier';
import { useToast } from '@/hooks/useToast';

// ─── Pricing data ────────────────────────────────────────────────────────────

// CEO-approved pricing (2026-04-05, TOL-145). Two plans: Active and Enterprise.
const PLANS = [
  {
    id: 'active' as const,
    name: 'Aktiv',
    nameEn: 'Active',
    monthlyNok: 990,
    annualMonthlyNok: 825,
    minutes: 300,
    overageNok: 3.0,
    features: {
      nb: [
        '300 inkluderte minutter per måned',
        'Ubrukte minutter overføres',
        '100+ språkpar',
        'GDPR-compliant',
        'Prioritert support',
        'Bruksstatistikk',
      ],
      en: [
        '300 included minutes per month',
        'Unused minutes roll over',
        '100+ language pairs',
        'GDPR compliant',
        'Priority support',
        'Usage statistics',
      ],
    },
    recommended: true,
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    nameEn: 'Enterprise',
    monthlyNok: 4990,
    annualMonthlyNok: 4158,
    minutes: 2000,
    overageNok: 2.0,
    features: {
      nb: [
        '2 000 inkluderte minutter per måned',
        'Ubrukte minutter overføres',
        '100+ språkpar',
        'GDPR-compliant',
        'Dedikert support',
        'Avansert bruksstatistikk',
        'Tilpasset fakturering',
      ],
      en: [
        '2,000 included minutes per month',
        'Unused minutes roll over',
        '100+ language pairs',
        'GDPR compliant',
        'Dedicated support',
        'Advanced usage statistics',
        'Custom invoicing',
      ],
    },
    recommended: false,
  },
] as const;

type PlanId = (typeof PLANS)[number]['id'];
type BillingInterval = 'monthly' | 'annual';

// ─── Subcomponents ────────────────────────────────────────────────────────────

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

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M5 13l4 4L19 7"
      stroke="var(--color-primary)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface PlanCardProps {
  plan: (typeof PLANS)[number];
  interval: BillingInterval;
  isSelected: boolean;
  isCurrentPlan: boolean;
  onSelect: () => void;
  locale: 'nb' | 'en';
  tt: ReturnType<typeof useT>;
}

const PlanCard = memo(function PlanCard({ plan, interval, isSelected, isCurrentPlan, onSelect, locale, tt }: PlanCardProps) {
  const price = interval === 'monthly' ? plan.monthlyNok : plan.annualMonthlyNok;
  const annualSavings = Math.round(
    ((plan.monthlyNok - plan.annualMonthlyNok) / plan.monthlyNok) * 100
  );
  const features = plan.features[locale];
  const displayName = locale === 'nb' ? plan.name : plan.nameEn;

  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      role="radio"
      aria-checked={isSelected}
      className="relative w-full text-left"
      style={{
        borderRadius: '20px',
        padding: '20px',
        cursor: isCurrentPlan ? 'default' : 'pointer',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.08))'
          : 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isSelected
          ? '2px solid var(--color-primary)'
          : '1px solid var(--glass-border)',
        boxShadow: isSelected ? 'var(--glass-glow-primary)' : 'var(--glass-shadow)',
        transition: 'all 0.2s ease',
        marginBottom: '12px',
      }}
    >
      {/* Recommended badge */}
      {plan.recommended && (
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            right: '16px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: '0 0 8px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            boxShadow: 'var(--glass-glow-primary)',
          }}
        >
          {tt('subscribe.recommended')}
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            left: '16px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: 'var(--color-success)',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: '0 0 8px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          {tt('subscribe.currentPlan')}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
              marginBottom: '2px',
            }}
          >
            {displayName}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {plan.minutes} min/{locale === 'nb' ? 'mnd' : 'mo'} · {plan.overageNok.toFixed(2).replace('.', ',')} kr/min {locale === 'nb' ? 'ekstra' : 'overage'}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', justifyContent: 'flex-end' }}>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {price.toLocaleString('nb-NO')}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
              {tt('subscribe.perMonth')}
            </span>
          </div>
          {interval === 'annual' && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-success)',
                fontWeight: 600,
              }}
            >
              -{annualSavings}% {tt('subscribe.vsMonthly')}
            </span>
          )}
        </div>
      </div>

      {/* Features list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {features.map((feature) => (
          <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon />
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{feature}</span>
          </div>
        ))}
      </div>

      {/* Selection indicator */}
      {isSelected && !isCurrentPlan && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.button>
  );
});

// ─── Plan Comparison Table ────────────────────────────────────────────────────

function PlanComparisonTable({ interval, locale, tt }: { interval: BillingInterval; locale: 'nb' | 'en'; tt: ReturnType<typeof useT> }) {
  const rows: { label: string; values: (string | boolean)[] }[] = locale === 'nb' ? [
    { label: 'Minutter per måned', values: ['300', '2 000'] },
    { label: 'Månedspris', values: ['990 kr', '4 990 kr'] },
    { label: 'Årspris per måned', values: ['825 kr', '4 158 kr'] },
    { label: 'Overskridelsespris', values: ['3,00 kr/min', '2,00 kr/min'] },
    { label: 'Ubrukte minutter overføres', values: [true, true] },
    { label: 'Prioritert support', values: [true, true] },
    { label: 'Avansert statistikk', values: [false, true] },
    { label: 'Tilpasset fakturering', values: [false, true] },
  ] : [
    { label: 'Minutes per month', values: ['300', '2,000'] },
    { label: 'Monthly price', values: ['990 NOK', '4,990 NOK'] },
    { label: 'Annual price/mo', values: ['825 NOK', '4,158 NOK'] },
    { label: 'Overage rate', values: ['3.00 NOK/min', '2.00 NOK/min'] },
    { label: 'Unused minutes roll over', values: [true, true] },
    { label: 'Priority support', values: [true, true] },
    { label: 'Advanced analytics', values: [false, true] },
    { label: 'Custom invoicing', values: [false, true] },
  ];

  const planNames = locale === 'nb'
    ? PLANS.map((p) => p.name)
    : PLANS.map((p) => p.nameEn);

  return (
    <div
      className="glass"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}
    >
    <div style={{ overflowX: 'auto', minWidth: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {tt('subscribe.comparison')}
        </h3>
      </div>

      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr repeat(2, 1fr)',
          padding: '10px 20px',
          borderBottom: '1px solid var(--glass-border)',
          backgroundColor: 'var(--glass-bg)',
        }}
      >
        <div />
        {PLANS.map((plan, i) => (
          <div key={plan.id} style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: plan.recommended ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              {planNames[i]}
            </span>
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr repeat(2, 1fr)',
            padding: '10px 20px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--glass-border)' : 'none',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{row.label}</span>
          {row.values.map((val, j) => (
            <div key={j} style={{ textAlign: 'center' }}>
              {typeof val === 'boolean' ? (
                val ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: 'inline' }}>
                    <path d="M5 13l4 4L19 7" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>–</span>
                )
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {val}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
    </div>
  );
}

// ─── Org member view ──────────────────────────────────────────────────────────

function OrgMemberView({ onBack, tt }: { onBack: () => void; tt: ReturnType<typeof useT> }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden glass-page">
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
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
          aria-label={tt('settings.goBack')}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          {tt('subscribe.title')}
        </h1>
      </header>

      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: '40px',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="glass"
          style={{
            padding: '32px 24px',
            borderRadius: '24px',
            textAlign: 'center',
            maxWidth: '380px',
            width: '100%',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏢</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            {tt('subscribe.orgManagedTitle')}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {tt('subscribe.orgManagedMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SubscribePage() {
  const router = useRouter();
  const { user } = useUser();
  const { locale } = useLocale();
  const tt = useT(locale);
  const { toast } = useToast();
  const { tier, orgId, orgName, isLoaded } = useUserTier();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('active');
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Private users: query by userId
  const userSubscription = useQuery(
    api.subscriptions.getSubscriptionByUserId,
    tier === 'private' && user?.id ? { clerkId: user.id } : 'skip'
  );

  // Org admins: query by orgId
  const orgSubscription = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.subscriptions.getSubscriptionByClerkOrgId,
    tier === 'org_admin' && orgId ? { clerkOrgId: orgId } : 'skip'
  );

  const subscription = tier === 'org_admin' ? orgSubscription : userSubscription;
  const currentTier = subscription?.tier ?? null;

  const handleSubscribe = async () => {
    if (isCheckingOut) return;

    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    setIsCheckingOut(true);
    try {
      const body =
        tier === 'org_admin'
          ? { tier: selectedPlan, billingInterval: interval, orgId }
          : { tier: selectedPlan, billingInterval: interval };

      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Checkout failed');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error(tt('subscribe.checkoutFailed'));
      setIsCheckingOut(false);
    }
  };

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan);
  const selectedPrice =
    interval === 'monthly'
      ? selectedPlanData?.monthlyNok
      : selectedPlanData?.annualMonthlyNok;

  const isCurrentPlan = currentTier === selectedPlan;
  const selectedDisplayName = locale === 'nb' ? selectedPlanData?.name : selectedPlanData?.nameEn;

  // Loading state
  if (!isLoaded) {
    return (
      <div className="h-screen flex flex-col overflow-hidden glass-page">
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
          <div className="w-10 h-10 rounded-full glass animate-pulse" />
          <div className="h-6 w-32 rounded glass animate-pulse" />
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  // Show org member view — subscription is managed by org admin
  if (tier === 'org_member') {
    return <OrgMemberView onBack={() => router.back()} tt={tt} />;
  }

  const ctaLabel = () => {
    if (isCheckingOut) return null;
    if (isCurrentPlan) return tt('subscribe.alreadyOnPlan');
    if (tier === 'org_admin' && orgName) {
      return tt('subscribe.subscribeForOrg', { orgName }) + ` — ${selectedPrice?.toLocaleString('nb-NO')} ${locale === 'nb' ? 'kr/mnd' : 'NOK/mo'}`;
    }
    return `${tt('subscribe.subscribeTo')} ${selectedDisplayName} — ${selectedPrice?.toLocaleString('nb-NO')} ${locale === 'nb' ? 'kr/mnd' : 'NOK/mo'}`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden glass-page">
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
          {tt('subscribe.title')}
          {tier === 'org_admin' && orgName && (
            <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>
              — {orgName}
            </span>
          )}
        </h1>
      </header>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: '120px',
        }}
      >
        {/* Tagline */}
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          {tt('subscribe.tagline')}
        </p>

        {/* Monthly / Annual toggle */}
        <div
          className="glass"
          style={{
            display: 'flex',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px',
          }}
        >
          {(['monthly', 'annual'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '9px',
                fontSize: '14px',
                fontWeight: 600,
                color: interval === opt ? '#FFFFFF' : 'var(--color-text-secondary)',
                background:
                  interval === opt
                    ? 'linear-gradient(135deg, var(--color-primary), #4F46E5)'
                    : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: interval === opt ? 'var(--glass-glow-primary)' : 'none',
              }}
            >
              {opt === 'monthly' ? tt('subscribe.monthly') : tt('subscribe.annual')}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div role="radiogroup" aria-label="Select plan" style={{ marginBottom: '24px' }}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              interval={interval}
              isSelected={selectedPlan === plan.id}
              isCurrentPlan={currentTier === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
              locale={locale}
              tt={tt}
            />
          ))}
        </div>

        {/* Annual billing note */}
        {interval === 'annual' && (
          <div
            className="glass-subtle"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {tt('subscribe.annualNote')}
            </p>
          </div>
        )}

        {/* Comparison table */}
        <PlanComparisonTable interval={interval} locale={locale} tt={tt} />

        {/* Buy minutes individually (private users only) */}
        {tier !== 'org_admin' && (
          <Link
            href="/settings/credits"
            className="block glass-subtle"
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              {tt('subscribe.justNeedMinutes')}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>
              {tt('subscribe.buyMinutes')} &rarr;
            </p>
          </Link>
        )}

        {/* Disclaimer */}
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.6,
            marginBottom: '16px',
            textAlign: 'center',
            paddingLeft: '8px',
            paddingRight: '8px',
          }}
        >
          {tt('subscribe.disclaimer')}
        </p>
      </div>

      {/* Sticky CTA */}
      <div
        className="glass-strong"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: '16px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderTop: '1px solid var(--glass-border)',
          borderRadius: 0,
          maxWidth: '430px',
          margin: '0 auto',
        }}
      >
        <motion.button
          onClick={handleSubscribe}
          disabled={isCheckingOut || isCurrentPlan}
          whileTap={{ scale: isCheckingOut || isCurrentPlan ? 1 : 0.97 }}
          style={{
            width: '100%',
            background:
              isCurrentPlan
                ? 'var(--color-success)'
                : isCheckingOut
                ? 'var(--color-neutral-300)'
                : 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
            paddingTop: '18px',
            paddingBottom: '18px',
            borderRadius: '14px',
            border: 'none',
            boxShadow:
              isCheckingOut || isCurrentPlan ? 'none' : 'var(--glass-glow-primary)',
            cursor: isCheckingOut || isCurrentPlan ? 'not-allowed' : 'pointer',
            opacity: isCheckingOut ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isCheckingOut ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', padding: '0 16px' }}>
              {ctaLabel()}
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}

export default function SubscribeScreen() {
  return <SubscribePage />;
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
import {
  getCreditRateForTier,
  MIN_CREDIT_PURCHASE_MINUTES,
  MAX_CREDIT_PURCHASE_MINUTES,
} from '@/lib/credit-packages';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

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

function StripeRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success || canceled) {
      const timer = setTimeout(() => router.replace('/settings/credits'), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  return null;
}

function AddOnContent() {
  const router = useRouter();
  const { user } = useUser();
  const { credits } = useCurrentUser();
  const { toast } = useToast();
  const { locale } = useLocale();
  const tt = useT(locale);
  const [minutes, setMinutes] = useState<number>(60);
  const [inputValue, setInputValue] = useState<string>('60');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch user subscription to determine per-minute rate
  const subscription = useQuery(
    api.subscriptions.getSubscriptionByUserId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  const currentTier: SubscriptionTier | 'none' =
    subscription?.tier && subscription.status !== 'canceled'
      ? (subscription.tier as SubscriptionTier)
      : 'none';

  const rateNok = getCreditRateForTier(currentTier);
  const totalNok = minutes * rateNok;
  const balance = credits || 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setMinutes(Math.min(Math.max(parsed, MIN_CREDIT_PURCHASE_MINUTES), MAX_CREDIT_PURCHASE_MINUTES));
    }
  };

  const handleInputBlur = () => {
    // Clamp and sync display value on blur
    const clamped = Math.min(Math.max(minutes, MIN_CREDIT_PURCHASE_MINUTES), MAX_CREDIT_PURCHASE_MINUTES);
    setMinutes(clamped);
    setInputValue(String(clamped));
  };

  const adjustMinutes = (delta: number) => {
    const next = Math.min(Math.max(minutes + delta, MIN_CREDIT_PURCHASE_MINUTES), MAX_CREDIT_PURCHASE_MINUTES);
    setMinutes(next);
    setInputValue(String(next));
  };

  const handlePurchase = async () => {
    if (isPurchasing || !user?.id) {
      if (!user?.id) {
        toast.error(locale === 'nb' ? 'Du må være logget inn for å kjøpe minutter.' : 'You must be signed in to buy minutes.');
      }
      return;
    }

    if (minutes < MIN_CREDIT_PURCHASE_MINUTES) {
      toast.error(locale === 'nb' ? `Minimum ${MIN_CREDIT_PURCHASE_MINUTES} minutt.` : `Minimum ${MIN_CREDIT_PURCHASE_MINUTES} minute.`);
      return;
    }

    setIsPurchasing(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes,
          clerkId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(locale === 'nb' ? 'Kunne ikke starte betaling. Prøv igjen.' : 'Could not start payment. Please try again.');
      setIsPurchasing(false);
    }
  };

  const tierLabelNb = currentTier === 'active' ? 'Aktiv' : currentTier === 'enterprise' ? 'Enterprise' : 'Free';
  const tierLabelEn = currentTier === 'active' ? 'Active' : currentTier === 'enterprise' ? 'Enterprise' : 'Free';

  return (
    <div className="h-screen flex flex-col overflow-hidden glass-page">
      <Suspense fallback={null}>
        <StripeRedirectHandler />
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
          {locale === 'nb' ? 'Legg til minutter' : 'Add minutes'}
        </h1>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: '24px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: '120px',
        }}
      >
        {/* Current balance */}
        <div
          className="glass"
          style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
              {locale === 'nb' ? 'Nåværende saldo' : 'Current balance'}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {balance.toFixed(0)} min
            </p>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Per-minute rate info */}
        <div
          className="glass-subtle"
          style={{
            padding: '14px 18px',
            borderRadius: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {locale === 'nb' ? `Din pris (${tierLabelNb}-plan)` : `Your rate (${tierLabelEn} plan)`}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              {rateNok.toFixed(2).replace('.', ',')} kr/min
            </p>
          </div>
          {currentTier === 'none' && (
            <Link href="/subscribe">
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'underline' }}>
                {locale === 'nb' ? 'Få bedre pris' : 'Get better rate'}
              </span>
            </Link>
          )}
        </div>

        {/* Minute quantity input */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '14px',
            letterSpacing: '0.3px',
          }}
        >
          {locale === 'nb' ? 'Antall minutter' : 'Number of minutes'}
        </p>

        <div
          className="glass"
          style={{
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          {/* Stepper + input row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => adjustMinutes(-10)}
              disabled={minutes <= MIN_CREDIT_PURCHASE_MINUTES}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                fontSize: '20px',
                fontWeight: 700,
                color: minutes <= MIN_CREDIT_PURCHASE_MINUTES ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                cursor: minutes <= MIN_CREDIT_PURCHASE_MINUTES ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label={locale === 'nb' ? '10 minutter mindre' : '10 minutes less'}
            >
              −
            </button>

            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '8px 0',
                }}
                aria-label={locale === 'nb' ? 'Antall minutter' : 'Number of minutes'}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                min
              </span>
            </div>

            <button
              onClick={() => adjustMinutes(10)}
              disabled={minutes >= MAX_CREDIT_PURCHASE_MINUTES}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                fontSize: '20px',
                fontWeight: 700,
                color: minutes >= MAX_CREDIT_PURCHASE_MINUTES ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                cursor: minutes >= MAX_CREDIT_PURCHASE_MINUTES ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label={locale === 'nb' ? '10 minutter mer' : '10 minutes more'}
            >
              +
            </button>
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[30, 60, 120, 300].map((qty) => (
              <button
                key={qty}
                onClick={() => { setMinutes(qty); setInputValue(String(qty)); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: minutes === qty ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                  background: minutes === qty ? 'var(--color-primary-alpha)' : 'var(--glass-bg)',
                  color: minutes === qty ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {qty} min
              </button>
            ))}
          </div>
        </div>

        {/* Price breakdown */}
        <div
          className="glass-subtle"
          style={{ padding: '16px 18px', borderRadius: '14px', marginBottom: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {minutes} min × {rateNok.toFixed(2).replace('.', ',')} kr/min
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {totalNok.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
            {[
              locale === 'nb' ? 'Minutter utløper aldri' : 'Minutes never expire',
              locale === 'nb' ? 'Bruk umiddelbart etter kjøp' : 'Use immediately after purchase',
              locale === 'nb' ? 'Alle 100+ språkpar inkludert' : 'All 100+ language pairs included',
            ].map((feature) => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckIcon />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.6,
            textAlign: 'center',
            paddingLeft: '8px',
            paddingRight: '8px',
          }}
        >
          {locale === 'nb'
            ? 'Engangskjøp. Ingen abonnement. Sikker betaling med Stripe.'
            : 'One-time purchase. No subscription. Secure payment via Stripe.'}
        </p>
      </div>

      {/* Sticky Bottom CTA */}
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
          onClick={handlePurchase}
          disabled={isPurchasing || minutes < MIN_CREDIT_PURCHASE_MINUTES}
          whileTap={{ scale: isPurchasing ? 1 : 0.97 }}
          style={{
            width: '100%',
            background: isPurchasing
              ? 'var(--color-neutral-300)'
              : 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
            paddingTop: '18px',
            paddingBottom: '18px',
            borderRadius: '14px',
            border: 'none',
            boxShadow: isPurchasing ? 'none' : 'var(--glass-glow-primary)',
            cursor: isPurchasing ? 'not-allowed' : 'pointer',
            opacity: isPurchasing ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isPurchasing ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
              {locale === 'nb'
                ? `Kjøp ${minutes} minutter — ${totalNok.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`
                : `Buy ${minutes} minutes — ${totalNok.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NOK`}
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}

export default function AddOnScreen() {
  return <AddOnContent />;
}

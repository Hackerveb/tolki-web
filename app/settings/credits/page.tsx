'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
import { creditPackages, type CreditPackage } from '@/lib/credit-packages';

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

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours >= 1) {
    return mins > 0 ? `${hours}t ${mins}m` : `${hours}t`;
  }
  return `${mins}m`;
};

const perMinuteRate = (pkg: CreditPackage): string => {
  const nok = pkg.priceOre / 100;
  return (nok / pkg.minutes).toFixed(2).replace('.', ',');
};

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
  const [selectedIndex, setSelectedIndex] = useState<number>(1);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const balance = credits || 0;
  const selectedPackage = creditPackages[selectedIndex];
  const priceInNok = (selectedPackage.priceOre / 100).toLocaleString('nb-NO');

  const handleSelectPackage = (index: number) => {
    if (index === selectedIndex || isPurchasing) return;
    setSelectedIndex(index);
  };

  const handlePurchase = async () => {
    if (isPurchasing || !user?.id) {
      if (!user?.id) {
        toast.error(locale === 'nb' ? 'Du må være logget inn for å kjøpe minutter.' : 'You must be signed in to buy minutes.');
      }
      return;
    }

    setIsPurchasing(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
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

        {/* Subscription upsell — subtle banner */}
        <Link href="/subscribe" className="block">
          <div
            className="glass-subtle"
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {locale === 'nb' ? 'Spar mer med abonnement' : 'Save more with a subscription'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                {locale === 'nb' ? 'Fra 190 kr/mnd — bedre minutt-pris' : 'From 190 NOK/mo — better per-minute rate'}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

        {/* Section label */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '14px',
            letterSpacing: '0.3px',
          }}
        >
          {locale === 'nb' ? 'Velg pakke' : 'Choose package'}
        </p>

        {/* Package Cards — premium flat design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {creditPackages.map((pkg, index) => {
            const isSelected = selectedIndex === index;
            const isRecommended = index === 1;

            return (
              <motion.button
                key={pkg.id}
                onClick={() => handleSelectPackage(index)}
                whileTap={{ scale: 0.98 }}
                className="relative w-full text-left"
                style={{
                  borderRadius: '16px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(79,70,229,0.06))'
                    : 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: isSelected
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--glass-border)',
                  boxShadow: isSelected ? 'var(--glass-glow-primary)' : 'var(--glass-shadow-sm)',
                }}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '16px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                      color: '#FFFFFF',
                      padding: '3px 10px',
                      borderRadius: '0 0 8px 8px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {locale === 'nb' ? 'Populær' : 'Popular'}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Left: minutes + per-minute rate */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: 700,
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        }}
                      >
                        {pkg.minutes} {locale === 'nb' ? 'minutter' : 'minutes'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                        {formatTime(pkg.minutes)}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {perMinuteRate(pkg)} kr/min
                    </span>
                  </div>

                  {/* Right: price + selection */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        }}
                      >
                        {pkg.displayPrice}
                      </span>
                    </div>
                    {isSelected && (
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* What you get */}
        <div
          className="glass-subtle"
          style={{ padding: '16px 18px', borderRadius: '14px', marginBottom: '16px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          disabled={isPurchasing}
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
                ? `Kjøp ${selectedPackage.minutes} minutter — ${priceInNok} kr`
                : `Buy ${selectedPackage.minutes} minutes — ${priceInNok} NOK`}
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

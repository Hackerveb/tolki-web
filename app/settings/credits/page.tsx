'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'motion/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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

// Recommended package index
const RECOMMENDED_INDEX = 1;

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours >= 1) {
    return mins > 0 ? `${hours}t ${mins}m` : `${hours}t`;
  }
  return `${mins}m`;
};

function StripeRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      alert('Betaling vellykket! Minuttene er lagt til kontoen din.');
      router.replace('/settings/credits');
    } else if (canceled) {
      alert('Betaling avbrutt. Ingen belastning.');
      router.replace('/settings/credits');
    }
  }, [searchParams, router]);

  return null;
}

function BuyCreditsContent() {
  const router = useRouter();
  const { user } = useUser();
  const { credits } = useCurrentUser();
  const [selectedIndex, setSelectedIndex] = useState<number>(RECOMMENDED_INDEX);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const balance = credits || 0;
  const selectedPackage = creditPackages[selectedIndex];
  const priceInNok = (selectedPackage.priceOre / 100).toFixed(0);

  const handleSelectPackage = (index: number) => {
    if (index === selectedIndex || isPurchasing) return;
    setSelectedIndex(index);
  };

  const handlePurchase = async () => {
    if (isPurchasing || !user?.id) {
      if (!user?.id) {
        alert('Du må være logget inn for å kjøpe minutter.');
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
      alert('Kunne ikke starte betaling. Prøv igjen.');
      setIsPurchasing(false);
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden glass-page"
    >
      <Suspense fallback={null}>
        <StripeRedirectHandler />
      </Suspense>

      {/* Glass Header */}
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
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          Kjøp minutter
        </h1>
        {/* Balance badge */}
        <div
          className="glass-subtle"
          style={{
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '12px',
            paddingRight: '12px',
            borderRadius: '99px',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>
            {balance.toFixed(0)} min
          </span>
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: '110px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          Velg en pakke
        </p>

        {/* Package Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {creditPackages.map((pkg, index) => {
            const isSelected = selectedIndex === index;
            const isRecommended = index === RECOMMENDED_INDEX;

            return (
              <motion.button
                key={pkg.id}
                onClick={() => handleSelectPackage(index)}
                whileTap={{ scale: 0.98 }}
                className="relative"
                style={{
                  borderRadius: '16px',
                  paddingTop: '18px',
                  paddingBottom: '18px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.08))'
                    : 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: isSelected
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--glass-border)',
                  boxShadow: isSelected
                    ? 'var(--glass-glow-primary)'
                    : 'var(--glass-shadow)',
                }}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '16px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                      color: '#FFFFFF',
                      padding: '3px 10px',
                      borderRadius: '0 0 8px 8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      boxShadow: 'var(--glass-glow-primary)',
                    }}
                  >
                    Beste verdi
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: minutes + time */}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        }}
                      >
                        {pkg.minutes} minutter
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 500,
                      }}
                    >
                      {formatTime(pkg.minutes)} tolking
                    </span>
                  </div>

                  {/* Right: price + selected indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      }}
                    >
                      {pkg.displayPrice}
                    </span>
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
            <span
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: '0.3px',
              }}
            >
              Kjøp nå — {priceInNok} kr
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}

export default function BuyCreditsScreen() {
  return <BuyCreditsContent />;
}

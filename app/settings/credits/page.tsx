'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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

interface CreditPackage {
  id: number;
  credits: number;
  price: number;
}

const creditPackages: CreditPackage[] = [
  { id: 0, credits: 30, price: 599 },
  { id: 1, credits: 60, price: 1099 },
  { id: 2, credits: 360, price: 5999 },
  { id: 3, credits: 720, price: 11499 },
  { id: 4, credits: 1440, price: 21999 },
];

// Helper function to format time display
const formatTime = (credits: number): string => {
  const totalMinutes = credits; // 1 credit per minute
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  if (hours >= 1) {
    return minutes > 0 ? `${hours}h ${minutes}m usage` : `${hours}h usage`;
  }
  return `${minutes}m usage`;
};

// Separate component for handling search params (requires Suspense)
function StripeRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      alert('Payment successful! Your credits have been added to your account.');
      router.replace('/settings/credits');
    } else if (canceled) {
      alert('Payment canceled. No charges were made.');
      router.replace('/settings/credits');
    }
  }, [searchParams, router]);

  return null;
}

function BuyCreditsContent() {
  const router = useRouter();
  const { user } = useUser();
  const { credits } = useCurrentUser();
  const [selectedPackageId, setSelectedPackageId] = useState<number>(1); // Default to 60 credits
  const [isPurchasing, setIsPurchasing] = useState(false);

  const balance = credits || 0;
  const selectedPackage = creditPackages[selectedPackageId];
  const priceInDollars = (selectedPackage.price / 100).toFixed(2);

  const handleSelectPackage = (packageId: number) => {
    if (packageId === selectedPackageId || isPurchasing) return;
    setSelectedPackageId(packageId);
  };

  const handlePurchase = async () => {
    if (isPurchasing || !user?.id) {
      if (!user?.id) {
        alert('You must be signed in to purchase credits.');
      }
      return;
    }

    setIsPurchasing(true);

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: `credits_${selectedPackage.credits}`,
          clerkId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
      setIsPurchasing(false);
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Stripe redirect handler (wrapped in Suspense in parent) */}
      <Suspense fallback={null}>
        <StripeRedirectHandler />
      </Suspense>

      {/* Header */}
      <header
        className="flex items-center sticky top-0 z-10"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          Buy Credits
        </h1>
        {/* Balance in header */}
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
          {balance.toFixed(0)}
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: '100px', // Space for sticky button
        }}
      >
        {/* Package Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {creditPackages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const isBestValue = pkg.id === 1; // 60 credits package

            return (
              <motion.button
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg.id)}
                whileTap={{ scale: 0.98 }}
                className="relative"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '12px',
                  paddingTop: '20px',
                  paddingBottom: '20px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Best Value Badge */}
                {isBestValue && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-on-primary)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Best Value
                  </div>
                )}

                {/* Credits and Time Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {pkg.credits} credits
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    •
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: '500',
                      color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {formatTime(pkg.credits)}
                  </span>
                </div>

                {/* Price Row */}
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    ${(pkg.price / 100).toFixed(2)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Button */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-background)',
          paddingTop: '16px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderTop: '1px solid var(--color-border)',
          maxWidth: '430px',
          margin: '0 auto',
        }}
      >
        <motion.button
          onClick={handlePurchase}
          disabled={isPurchasing}
          whileTap={{ scale: isPurchasing ? 1 : 0.98 }}
          style={{
            width: '100%',
            backgroundColor: 'var(--color-primary)',
            paddingTop: '18px',
            paddingBottom: '18px',
            borderRadius: '12px',
            border: 'none',
            boxShadow: 'var(--shadow-md)',
            cursor: isPurchasing ? 'not-allowed' : 'pointer',
            opacity: isPurchasing ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isPurchasing ? (
            <div className="flex items-center justify-center">
              <div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
            </div>
          ) : (
            <span
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: 'var(--color-on-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              BUY NOW - ${priceInDollars}
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

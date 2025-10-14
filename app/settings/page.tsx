'use client';

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

const ArrowIcon = memo(() => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="9 18 15 12 9 6"
      stroke={colors.silverAlpha(0.6)}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
ArrowIcon.displayName = 'ArrowIcon';

const BackIcon = memo(() => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="15 18 9 12 15 6"
      stroke={colors.foreground}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
BackIcon.displayName = 'BackIcon';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  isAccent?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = memo(({
  title,
  onPress,
  icon,
  isAccent = false,
}) => (
  <button
    onClick={onPress}
    className="flex items-center transition-all active:scale-[0.98]"
    style={{
      width: '100%',
      padding: '14px',
      backgroundColor: isAccent ? colors.primary : colors.background,
      boxShadow: shadows.subtle.boxShadow,
      borderRadius: '16px',
      marginBottom: '12px',
      justifyContent: isAccent ? 'center' : 'space-between',
      border: 'none',
      cursor: 'pointer',
    }}
  >
    <span
      className="text-sm font-medium"
      style={{ color: isAccent ? colors.white : colors.foreground, fontWeight: '500' }}
    >
      {title}
    </span>
    {icon && !isAccent && <div style={{ opacity: 0.6 }}>{icon}</div>}
  </button>
));
ActionButton.displayName = 'ActionButton';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { displayName, email, initials, credits, clerkUser } = useCurrentUser();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const balance = credits || 0;
  const isLowOnCredits = balance > 0 && balance < 5;

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      router.push('/sign-in');
    }
  };

  const handleDeleteAccount = async () => {
    if (!clerkUser) return;

    const firstConfirm = confirm(
      `Are you sure you want to delete your account?\n\n⚠️ WARNING:\n\n• This action is PERMANENT and cannot be undone\n• All your data will be deleted\n• Your remaining ${balance.toFixed(2)} credits will be forfeited\n• Any active sessions will be ended immediately`
    );

    if (!firstConfirm) return;

    const secondConfirm = confirm('This is your last chance. Delete your account permanently?');

    if (secondConfirm) {
      setIsDeletingAccount(true);
      try {
        await clerkUser.delete();
        router.push('/onboarding');
      } catch (error) {
        console.error('Account deletion error:', error);
        alert('Failed to delete your account. Please try again or contact support.');
        setIsDeletingAccount(false);
      }
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <header
        className="flex items-center"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: `1px solid ${colors.silverAlpha(0.2)}`,
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
          }}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: colors.foreground }}>
          Settings
        </h1>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* User Profile Section */}
        <div
          className="flex flex-col items-center"
          style={{
            padding: '20px',
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
            borderRadius: '20px',
            marginTop: '20px',
            marginBottom: '20px',
          }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '40px',
              backgroundColor: colors.background,
              boxShadow: shadows.elevated.boxShadow,
              marginBottom: '15px',
            }}
          >
            <span style={{ fontSize: '32px', fontWeight: '600', color: colors.primary }}>
              {initials}
            </span>
          </div>

          {/* Name & Email */}
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.foreground, marginBottom: '5px' }}>
            {displayName}
          </h2>
          <p style={{ fontSize: '14px', color: colors.silver, marginBottom: '15px' }}>
            {email}
          </p>

          {/* Credits Display - Compact */}
          <div
            className="flex items-center justify-center"
            style={{
              marginTop: '16px',
              marginBottom: '20px',
              gap: '12px',
            }}
          >
            {/* Credits Badge */}
            <div
              className="flex items-baseline"
              style={{
                backgroundColor: colors.primary,
                paddingTop: '8px',
                paddingBottom: '8px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderRadius: '20px',
                boxShadow: shadows.elevated.boxShadow,
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '24px', fontWeight: '700', color: colors.white }}>
                {balance.toFixed(1)}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: colors.white, opacity: 0.9 }}>
                credits
              </span>
            </div>

            {/* Minutes Display */}
            <span style={{ fontSize: '13px', color: colors.silverAlpha(0.6), fontWeight: '500' }}>
              ≈ {balance.toFixed(0)} min
            </span>

            {/* Low Credits Warning */}
            {isLowOnCredits && (
              <div style={{ backgroundColor: '#FF6B6B', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '10px', paddingRight: '10px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: colors.white, fontWeight: '600' }}>
                  ⚠️ Low
                </span>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="transition-all hover:scale-105 active:scale-95"
            style={{
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: '24px',
              paddingRight: '24px',
              backgroundColor: colors.background,
              boxShadow: shadows.subtle.boxShadow,
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '500', color: colors.error }}>
              Sign Out
            </span>
          </button>
        </div>

        {/* Management Section */}
        <div
          style={{
            padding: '20px',
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
            borderRadius: '20px',
            marginBottom: '20px',
          }}
        >
          <div className="flex items-center" style={{ gap: '10px', marginBottom: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                stroke={colors.foreground}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.foreground }}>
              Manage
            </h3>
          </div>

          <Link href="/settings/credits" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full"
              style={{
                padding: '14px',
                backgroundColor: colors.background,
                boxShadow: shadows.subtle.boxShadow,
                borderRadius: '16px',
                marginBottom: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: colors.foreground, fontWeight: '500' }}>
                Buy Credits
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>
          <Link href="/settings/billing" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full"
              style={{
                padding: '14px',
                backgroundColor: colors.background,
                boxShadow: shadows.subtle.boxShadow,
                borderRadius: '16px',
                marginBottom: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: colors.foreground, fontWeight: '500' }}>
                Billing History
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>
        </div>

        {/* Profile Section */}
        <div
          style={{
            padding: '20px',
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
            borderRadius: '20px',
            marginBottom: '20px',
          }}
        >
          <div className="flex items-center" style={{ gap: '10px', marginBottom: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={colors.foreground} strokeWidth="2" />
              <circle cx="12" cy="7" r="4" stroke={colors.foreground} strokeWidth="2" />
            </svg>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.foreground }}>
              Profile
            </h3>
          </div>

          <Link href="/settings/profile" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full"
              style={{
                padding: '14px',
                backgroundColor: colors.background,
                boxShadow: shadows.subtle.boxShadow,
                borderRadius: '16px',
                marginBottom: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: colors.foreground, fontWeight: '500' }}>
                Edit Profile
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>

          {/* Delete Account Section */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: `1px solid ${colors.silverAlpha(0.2)}`,
            }}
          >
            <button
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="flex items-center justify-center transition-all hover:opacity-90 active:scale-98 disabled:opacity-60"
              style={{
                width: '100%',
                gap: '8px',
                paddingTop: '14px',
                paddingBottom: '14px',
                paddingLeft: '20px',
                paddingRight: '20px',
                backgroundColor: colors.error,
                boxShadow: shadows.subtle.boxShadow,
                borderRadius: '16px',
                border: 'none',
                cursor: isDeletingAccount ? 'not-allowed' : 'pointer',
                marginBottom: '8px',
              }}
            >
              {isDeletingAccount ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.white }}>
                    Delete Account
                  </span>
                </>
              )}
            </button>
            <p
              style={{
                fontSize: '11px',
                color: colors.silverAlpha(0.6),
                textAlign: 'center',
                paddingLeft: '12px',
                paddingRight: '12px',
              }}
            >
              ⚠️ This action is permanent and cannot be undone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

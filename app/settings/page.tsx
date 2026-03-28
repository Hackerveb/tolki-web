'use client';

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ArrowIcon = memo(() => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="9 18 15 12 9 6"
      stroke="var(--color-text-tertiary)"
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
      stroke="var(--color-text-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
BackIcon.displayName = 'BackIcon';

function SettingsScreenInner() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { displayName, email, initials, credits, clerkUser } = useCurrentUser();
  const { isDark, setTheme } = useTheme();
  const { toast } = useToast();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const balance = credits || 0;
  const isLowOnCredits = balance > 0 && balance < 5;

  const formatCreditsDisplay = (credits: number): string => {
    if (credits < 60) {
      return `${credits.toFixed(0)} minutes`;
    } else {
      return `${(credits / 60).toFixed(1)} hours`;
    }
  };

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutConfirm(false);
    await signOut();
    router.push('/sign-in');
  };

  const handleDeleteAccount = () => {
    if (!clerkUser) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!clerkUser) return;
    setShowDeleteConfirm(false);
    setIsDeletingAccount(true);
    try {
      await clerkUser.delete();
      router.push('/onboarding');
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete your account. Please try again or contact support.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
    <ConfirmDialog
      isOpen={showSignOutConfirm}
      title="Sign Out"
      message="Are you sure you want to sign out?"
      confirmLabel="Sign Out"
      cancelLabel="Cancel"
      onConfirm={confirmSignOut}
      onCancel={() => setShowSignOutConfirm(false)}
    />
    <ConfirmDialog
      isOpen={showDeleteConfirm}
      title="Delete Account"
      message={`This action is PERMANENT and cannot be undone. All your data will be deleted and your remaining ${balance.toFixed(2)} credits will be forfeited.`}
      confirmLabel="Delete Account"
      cancelLabel="Cancel"
      isDangerous
      onConfirm={confirmDeleteAccount}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    <div
      className="h-screen flex flex-col overflow-hidden glass-page"
    >
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
          Settings
        </h1>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* User Profile Section */}
        <div
          className="flex flex-col items-center glass"
          style={{
            padding: '28px 24px',
            borderRadius: '20px',
            marginTop: '20px',
            marginBottom: '16px',
          }}
        >
          {/* Avatar with gradient ring */}
          <div
            style={{
              padding: '3px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), #818CF8, #38BDF8)',
              boxShadow: 'var(--glass-glow-primary)',
              marginBottom: '16px',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
              }}
            >
              <span style={{ fontSize: '32px', fontWeight: '600', color: 'var(--color-on-primary)' }}>
                {initials}
              </span>
            </div>
          </div>

          {/* Name & Email */}
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {displayName}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            {email}
          </p>

          {/* Credits Display */}
          <div
            className="flex flex-col items-center"
            style={{
              marginBottom: '20px',
              gap: '8px',
            }}
          >
            {/* Credits Badge */}
            <div
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingLeft: '24px',
                paddingRight: '24px',
                borderRadius: '16px',
                boxShadow: 'var(--glass-glow-primary)',
                gap: '2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '26px', fontWeight: '700', color: '#FFFFFF', lineHeight: '1' }}>
                {formatCreditsDisplay(balance)}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '500', color: 'rgba(255,255,255,0.75)' }}>
                {balance.toFixed(0)} credits remaining
              </span>
            </div>

            {/* Low Credits Warning */}
            {isLowOnCredits && (
              <div
                style={{
                  backgroundColor: 'var(--color-warning)',
                  paddingTop: '4px',
                  paddingBottom: '4px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  borderRadius: '99px',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--color-on-warning)', fontWeight: '600' }}>
                  ⚠️ Low credits
                </span>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="transition-all hover:scale-105 active:scale-95 glass"
            style={{
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: '28px',
              paddingRight: '28px',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-error)' }}>
              Sign Out
            </span>
          </button>
        </div>

        {/* Management Section */}
        <div
          className="glass"
          style={{
            padding: '20px',
            borderRadius: '20px',
            marginBottom: '16px',
          }}
        >
          <div className="flex items-center" style={{ gap: '10px', marginBottom: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Manage
            </h3>
          </div>

          <Link href="/settings/credits" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Buy Credits
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>
          <Link href="/settings/billing" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Billing History
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>
        </div>

        {/* Appearance Section */}
        <div
          className="glass"
          style={{
            padding: '20px',
            borderRadius: '20px',
            marginBottom: '16px',
          }}
        >
          <div className="flex items-center" style={{ gap: '10px', marginBottom: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="var(--color-primary)" strokeWidth="2" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Appearance
            </h3>
          </div>

          {/* Dark Mode Toggle */}
          <div
            className="flex items-center justify-between glass-subtle"
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
            }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
              Dark mode
            </span>
            <button
              role="switch"
              aria-checked={isDark}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: '52px',
                height: '30px',
                borderRadius: '15px',
                backgroundColor: isDark ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.25s ease',
                boxShadow: isDark ? 'var(--glass-glow-primary)' : 'var(--shadow-inner)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  top: '3px',
                  left: isDark ? '25px' : '3px',
                  transition: 'left 0.25s ease',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div
          className="glass"
          style={{
            padding: '20px',
            borderRadius: '20px',
            marginBottom: '20px',
          }}
        >
          <div className="flex items-center" style={{ gap: '10px', marginBottom: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="var(--color-primary)" strokeWidth="2" />
              <circle cx="12" cy="7" r="4" stroke="var(--color-primary)" strokeWidth="2" />
            </svg>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Profile
            </h3>
          </div>

          <Link href="/settings/profile" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '24px',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Edit Profile
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>

          {/* Delete Account */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid var(--glass-border)',
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
                backgroundColor: 'var(--color-error)',
                boxShadow: '0 4px 16px rgba(220, 38, 38, 0.25)',
                borderRadius: '12px',
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
                      stroke="var(--color-on-error)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-on-error)' }}>
                    Delete Account
                  </span>
                </>
              )}
            </button>
            <p
              style={{
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
                textAlign: 'center',
                paddingLeft: '12px',
                paddingRight: '12px',
              }}
            >
              This action is permanent and cannot be undone
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function SettingsScreen() {
  return (
    <ErrorBoundary>
      <SettingsScreenInner />
    </ErrorBoundary>
  );
}

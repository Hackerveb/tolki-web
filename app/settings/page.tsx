'use client';

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClerk, useOrganization } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTheme } from '@/hooks/useTheme';
import { useLocale, Locale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
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

// ─── Menu item icons ─────────────────────────────────────────────────────────

const UpgradeIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
UpgradeIcon.displayName = 'UpgradeIcon';

const BillingIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="2" stroke="var(--color-text-secondary)" strokeWidth="2" />
    <line x1="1" y1="10" x2="23" y2="10" stroke="var(--color-text-secondary)" strokeWidth="2" />
  </svg>
));
BillingIcon.displayName = 'BillingIcon';

const OrgIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" stroke="var(--color-text-secondary)" strokeWidth="2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
OrgIcon.displayName = 'OrgIcon';

const ProfileIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="var(--color-text-secondary)" strokeWidth="2" />
  </svg>
));
ProfileIcon.displayName = 'ProfileIcon';

const MoonIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
MoonIcon.displayName = 'MoonIcon';

const GlobeIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="var(--color-text-secondary)" strokeWidth="2" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="var(--color-text-secondary)" strokeWidth="2" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="var(--color-text-secondary)" strokeWidth="2" />
  </svg>
));
GlobeIcon.displayName = 'GlobeIcon';

const SignOutIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16 17 21 12 16 7" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="12" x2="9" y2="12" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
SignOutIcon.displayName = 'SignOutIcon';

const ClockIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="2" />
    <polyline points="12 6 12 12 16 14" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
ClockIcon.displayName = 'ClockIcon';

function SettingsScreenInner() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { displayName, email, initials, credits, clerkUser } = useCurrentUser();
  const { organization } = useOrganization();
  const { isDark, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const tt = useT(locale);
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
      title={tt('settings.signOut')}
      message={tt('settings.signOutConfirm')}
      confirmLabel={tt('settings.signOut')}
      cancelLabel={tt('settings.cancel')}
      onConfirm={confirmSignOut}
      onCancel={() => setShowSignOutConfirm(false)}
    />
    <ConfirmDialog
      isOpen={showDeleteConfirm}
      title={tt('settings.deleteAccount')}
      message={locale === 'nb'
        ? `Denne handlingen er PERMANENT og kan ikke angres. Alle dine data blir slettet og dine gjenværende ${balance.toFixed(2)} credits går tapt.`
        : `This action is PERMANENT and cannot be undone. All your data will be deleted and your remaining ${balance.toFixed(2)} credits will be forfeited.`}
      confirmLabel={tt('settings.deleteAccount')}
      cancelLabel={tt('settings.cancel')}
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
          aria-label={tt('settings.goBack')}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          {tt('settings.title')}
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
            <div className="flex items-center gap-2">
              <ClockIcon />
              <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-primary)', lineHeight: '1' }}>
                {formatCreditsDisplay(balance)}
              </span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
              {balance.toFixed(0)} {tt('settings.creditsRemaining')}
            </span>

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
                  ⚠️ {tt('settings.lowCredits')}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Organization Section */}
        {organization && (
          <div
            className="glass"
            style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}
          >
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="flex items-center gap-2" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                <OrgIcon />
                {tt('settings.organization')}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                {organization.name}
              </span>
            </div>
            <Link href="/settings/organization" prefetch={true} className="w-full">
              <button
                className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
                style={{ padding: '14px 16px', borderRadius: '12px', cursor: 'pointer' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {tt('settings.manageOrg')}
                </span>
                <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
              </button>
            </Link>
          </div>
        )}

        {/* Management Section */}
        <div
          className="glass"
          style={{
            padding: '20px',
            borderRadius: '20px',
            marginBottom: '16px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {tt('settings.manage')}
            </h3>
          </div>

          <Link href="/subscribe" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                <UpgradeIcon />
                {tt('settings.upgrade')}
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
                marginBottom: '10px',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                <BillingIcon />
                {tt('settings.billing')}
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>
          <Link href="/settings/credits" prefetch={true} className="w-full">
            <button
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {tt('settings.buyCredits')}
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
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {tt('settings.appearance')}
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
            <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
              <MoonIcon />
              {tt('settings.darkMode')}
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

          {/* Language Selector */}
          <div
            className="flex items-center justify-between glass-subtle"
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              marginTop: '10px',
            }}
          >
            <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
              <GlobeIcon />
              {tt('settings.language')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setLocale('nb')}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  background: locale === 'nb' ? 'var(--color-primary-alpha)' : 'var(--glass-bg)',
                  border: locale === 'nb' ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: locale === 'nb' ? '600' : '500',
                  color: locale === 'nb' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                }}
                aria-label="Norsk"
              >
                <span className="text-lg leading-none">&#x1F1F3;&#x1F1F4;</span>
              </button>
              <button
                onClick={() => setLocale('en')}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  background: locale === 'en' ? 'var(--color-primary-alpha)' : 'var(--glass-bg)',
                  border: locale === 'en' ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: locale === 'en' ? '600' : '500',
                  color: locale === 'en' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                }}
                aria-label="English"
              >
                <span className="text-lg leading-none">&#x1F1EC;&#x1F1E7;</span>
              </button>
            </div>
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
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {tt('settings.profile')}
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
              <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                <ProfileIcon />
                {tt('settings.editProfile')}
              </span>
              <div style={{ opacity: 0.6 }}><ArrowIcon /></div>
            </button>
          </Link>

          {/* Sign Out & Delete Account */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: '1px solid var(--glass-border)',
            }}
          >
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] glass"
              style={{
                width: '100%',
                paddingTop: '14px',
                paddingBottom: '14px',
                borderRadius: '12px',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              <SignOutIcon />
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-error)' }}>
                {tt('settings.signOut')}
              </span>
            </button>
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
                    {tt('settings.deleteAccount')}
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
              {tt('settings.deleteWarning')}
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

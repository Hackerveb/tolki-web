'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization, OrganizationSwitcher } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline points="15 18 9 12 15 6" stroke="var(--color-text-primary)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline points="9 18 15 12 9 6" stroke="var(--color-text-tertiary)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="var(--color-primary)"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" stroke="var(--color-primary)"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BarChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <line x1="18" y1="20" x2="18" y2="10" stroke="var(--color-primary)"
      strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="20" x2="12" y2="4" stroke="var(--color-primary)"
      strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6" y1="20" x2="6" y2="14" stroke="var(--color-primary)"
      strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"
      stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="10" x2="23" y2="10" stroke="var(--color-primary)"
      strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  active: 'Active',
  enterprise: 'Enterprise',
};

const TIER_COLORS: Record<string, string> = {
  free: 'var(--color-text-tertiary)',
  active: 'var(--color-primary)',
  enterprise: '#F59E0B',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--color-success)',
  trialing: 'var(--color-primary)',
  past_due: 'var(--color-warning)',
  canceled: 'var(--color-error)',
};

const STATUS_I18N_KEYS: Record<string, 'billing.statusActive' | 'billing.statusTrialing' | 'billing.statusPastDue' | 'billing.statusCanceled'> = {
  active: 'billing.statusActive',
  trialing: 'billing.statusTrialing',
  past_due: 'billing.statusPastDue',
  canceled: 'billing.statusCanceled',
};

// ─── Usage progress bar ────────────────────────────────────────────────────────

function UsageBar({ used, total, tt }: { used: number; total: number; tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color =
    pct >= 100 ? 'var(--color-error)' :
    pct >= 80  ? 'var(--color-warning)' :
    pct >= 60  ? '#F59E0B' :
    'var(--color-success)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {tt('billing.minutesProgress', { used: used.toFixed(0), total: total.toFixed(0) })}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div style={{
        height: '6px', borderRadius: '3px', overflow: 'hidden',
        backgroundColor: 'var(--color-neutral-200)',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '3px',
          backgroundColor: color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

// ─── Subscription banner ──────────────────────────────────────────────────────

function SubscriptionBanner({
  subscription,
  org,
  isAdmin,
  tt,
}: {
  subscription: { status: string; tier: string; includedMinutes: number } | null | undefined;
  org: { minutesUsedThisCycle: number; totalMinutesAvailable: number; rolloverMinutes?: number } | null | undefined;
  isAdmin: boolean;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
}) {
  if (subscription === undefined || org === undefined) return null; // still loading

  if (!subscription) {
    return (
      <div className="glass" style={{
        padding: '20px', borderRadius: '20px', marginBottom: '16px',
        border: '1px solid var(--color-primary)',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(79,70,229,0.05))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            backgroundColor: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"
                stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {tt('org.noActiveSubscription')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              {tt('org.choosePlanForTeam')}
            </p>
            {isAdmin && (
              <Link href="/subscribe">
                <button style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                  color: '#fff', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: 'var(--glass-glow-primary)',
                }}>
                  {tt('org.subscribeNow')}
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Use subscription.includedMinutes + rollover as the total budget (not totalMinutesAvailable which is the remaining pool)
  const totalBudget = (subscription?.includedMinutes ?? 0) + (org?.rolloverMinutes ?? 0);
  const pct = org && totalBudget > 0
    ? (org.minutesUsedThisCycle / totalBudget) * 100
    : 0;

  if (pct >= 100) {
    return (
      <div className="glass" style={{
        padding: '16px', borderRadius: '16px', marginBottom: '16px',
        borderLeft: '3px solid var(--color-error)',
      }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-error)', marginBottom: '4px' }}>
          {tt('org.allMinutesUsed')}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {tt('org.allMinutesUsedDesc')}
        </p>
      </div>
    );
  }

  if (pct >= 80) {
    return (
      <div className="glass" style={{
        padding: '16px', borderRadius: '16px', marginBottom: '16px',
        borderLeft: '3px solid var(--color-warning)',
      }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '4px' }}>
          {tt('org.nearingLimit')}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {tt('org.nearingLimitDesc', { pct: (100 - pct).toFixed(0) })}
        </p>
      </div>
    );
  }

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { organization, membership, isLoaded } = useOrganization();
  const { locale } = useLocale();
  const tt = useT(locale);

  // Convex queries — cast to any since types regenerate on next `convex dev`
  const convexOrg = useQuery(

    api.organizations.getOrganizationByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );
  const subscription = useQuery(

    api.subscriptions.getSubscriptionByClerkOrgId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );

  const updatePoolMode = useMutation(

    api.organizations.updateCreditPoolMode
  );

  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [showPoolModeConfirm, setShowPoolModeConfirm] = useState(false);

  const isAdmin = membership?.role === 'org:admin' || membership?.role === 'org:owner';
  const poolMode = convexOrg?.creditPoolMode ?? 'shared';

  const handlePoolModeToggle = () => {
    if (!convexOrg || !isAdmin || isTogglingMode) return;
    setShowPoolModeConfirm(true);
  };

  const confirmPoolModeToggle = async () => {
    if (!convexOrg || isTogglingMode) return;
    setIsTogglingMode(true);
    setShowPoolModeConfirm(false);
    try {
      await updatePoolMode({
        orgId: convexOrg._id,
        mode: poolMode === 'shared' ? 'individual' : 'shared',
      });
    } catch (e) {
      console.error('Failed to update pool mode', e);
    } finally {
      setIsTogglingMode(false);
    }
  };

  // Still loading org context from Clerk — show nothing to avoid flash of "create org" button
  if (!isLoaded) {
    return (
      <div className="glass-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '3px solid var(--glass-border)',
          borderTopColor: 'var(--color-primary)',
        }} />
      </div>
    );
  }

  // No org selected state — only shown to private users after loading completes
  if (!organization) {
    return (
      <div className="glass-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header className="flex items-center glass-strong" style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: '1px solid var(--glass-border)',
          borderRadius: 0,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
            aria-label={tt('settings.goBack')}>
            <BackIcon />
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
            {tt('settings.organization')}
          </h1>
        </header>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 24px',
        }}>
          <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center', maxWidth: '340px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏢</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              {tt('org.noOrgSelected')}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              {tt('org.createOrJoin')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  elements: {
                    rootBox: { width: '100%' },
                    organizationSwitcherTrigger: {
                      padding: '12px 20px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '14px',
                      width: '100%',
                      justifyContent: 'center',
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const subData = subscription?.org;
  const usedMin = subData?.minutesUsedThisCycle ?? 0;
  // Total budget = included minutes from plan + rollover (not the remaining pool)
  const totalMin = (subscription?.includedMinutes ?? 0) + (subData?.rolloverMinutes ?? 0);
  const dateLocale = locale === 'nb' ? 'nb-NO' : 'en-US';
  const cycleEnd = subData?.currentBillingCycleEnd
    ? new Date(subData.currentBillingCycleEnd).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <>
    <ConfirmDialog
      isOpen={showPoolModeConfirm}
      title={tt('org.confirmPoolModeTitle')}
      message={poolMode === 'shared' ? tt('org.confirmPoolModeIndividualMsg') : tt('org.confirmPoolModeSharedMsg')}
      onConfirm={confirmPoolModeToggle}
      onCancel={() => setShowPoolModeConfirm(false)}
    />
    <div className="glass-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sticky header */}
      <header className="flex items-center glass-strong" style={{
        gap: '15px',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
        paddingBottom: '20px',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        borderBottom: '1px solid var(--glass-border)',
        borderRadius: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
          aria-label={tt('settings.goBack')}>
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {organization.name}
        </h1>
      </header>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        paddingTop: '20px',
      }}>
        {/* Org identity card */}
        <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                {organization.name?.[0]?.toUpperCase() ?? 'O'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {organization.name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                /{organization.slug}
              </p>
            </div>
            {membership && (
              <span style={{
                padding: '3px 8px', borderRadius: '6px',
                fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px',
                backgroundColor: 'var(--color-primary-alpha)',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}>
                {membership.role?.replace('org:', '') ?? 'member'}
              </span>
            )}
          </div>
        </div>

        {/* Subscription banner (conditional) */}
        <SubscriptionBanner
          subscription={subscription ?? null}
          org={subData ?? null}
          isAdmin={isAdmin}
          tt={tt}
        />

        {/* Subscription card */}
        {subscription !== undefined && (
          <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                {tt('org.subscription')}
              </h3>
              {subscription && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: TIER_COLORS[subscription.tier] ?? 'var(--color-text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                  }}>
                    {TIER_LABELS[subscription.tier] ?? subscription.tier}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: STATUS_COLORS[subscription.status] ?? 'var(--color-text-secondary)',
                    color: '#fff',
                  }}>
                    {STATUS_I18N_KEYS[subscription.status] ? tt(STATUS_I18N_KEYS[subscription.status]) : subscription.status}
                  </span>
                </div>
              )}
            </div>

            {subscription && subData ? (
              <>
                <UsageBar used={usedMin} total={totalMin} tt={tt} />
                {subData.rolloverMinutes > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                    {tt('org.includesRollover', { n: String(subData.rolloverMinutes) })}
                  </p>
                )}
                {cycleEnd && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    {tt('org.resetsOn', { date: cycleEnd })}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {tt('org.noActivePlanTeam')}
              </p>
            )}
          </div>
        )}

        {/* Credit pool mode */}
        {convexOrg && isAdmin && (
          <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', marginBottom: '4px' }}>
                {tt('org.creditPoolMode')}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {poolMode === 'shared' ? tt('org.sharedPoolDesc') : tt('org.individualPoolDesc')}
              </p>
            </div>
            <div className="glass-subtle" style={{ padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', display: 'block', marginBottom: '2px' }}>
                  {poolMode === 'shared' ? tt('org.sharedPool') : tt('org.individualLimits')}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                  {poolMode === 'shared' ? tt('org.switchToIndividual') : tt('org.switchToShared')}
                </span>
              </div>
              <button
                role="switch"
                aria-checked={poolMode === 'individual'}
                onClick={handlePoolModeToggle}
                disabled={isTogglingMode}
                aria-label={tt('org.togglePoolMode')}
                style={{
                  width: '52px', height: '30px', borderRadius: '15px',
                  backgroundColor: poolMode === 'individual' ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                  position: 'relative', border: 'none', cursor: isTogglingMode ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.25s ease',
                  boxShadow: poolMode === 'individual' ? 'var(--glass-glow-primary)' : 'var(--shadow-inner)',
                  opacity: isTogglingMode ? 0.6 : 1, flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', width: '24px', height: '24px', borderRadius: '12px',
                  backgroundColor: '#fff', top: '3px',
                  left: poolMode === 'individual' ? '25px' : '3px',
                  transition: 'left 0.25s ease', boxShadow: 'var(--shadow-sm)',
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {tt('settings.manage')}
            </h3>
          </div>

          <Link href="/settings/organization/members" className="w-full">
            <button className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{ padding: '14px 16px', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UsersIcon />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {tt('org.members')}
                </span>
              </div>
              <ArrowIcon />
            </button>
          </Link>

          <Link href="/settings/organization/usage" className="w-full">
            <button className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{ padding: '14px 16px', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BarChartIcon />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {tt('org.usageDashboard')}
                </span>
              </div>
              <ArrowIcon />
            </button>
          </Link>

          {isAdmin && (
            <button
              onClick={async () => {
                // Redirect to Stripe billing portal via API route
                try {
                  const res = await fetch('/api/stripe/portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  }
                } catch (e) {
                  console.error('Failed to open billing portal:', e);
                }
              }}
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{ padding: '14px 16px', borderRadius: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CreditCardIcon />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {tt('org.billingPortal')}
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                  stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                <polyline points="15 3 21 3 21 9" stroke="var(--color-text-tertiary)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="10" y1="14" x2="21" y2="3" stroke="var(--color-text-tertiary)"
                  strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

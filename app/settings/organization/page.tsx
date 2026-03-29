'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization, OrganizationSwitcher } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

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
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  enterprise: 'Enterprise',
};

const TIER_COLORS: Record<string, string> = {
  free: 'var(--color-text-tertiary)',
  small: 'var(--color-text-secondary)',
  medium: 'var(--color-primary)',
  large: '#8B5CF6',
  enterprise: '#F59E0B',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'var(--color-success)' },
  trialing: { label: 'Trial', color: 'var(--color-primary)' },
  past_due: { label: 'Past Due', color: 'var(--color-warning)' },
  canceled: { label: 'Cancelled', color: 'var(--color-error)' },
};

// ─── Usage progress bar ────────────────────────────────────────────────────────

function UsageBar({ used, total }: { used: number; total: number }) {
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
          {used.toFixed(0)} / {total.toFixed(0)} min used
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
}: {
  subscription: { status: string; tier: string; includedMinutes: number } | null | undefined;
  org: { minutesUsedThisCycle: number; totalMinutesAvailable: number } | null | undefined;
}) {
  if (subscription === undefined || org === undefined) return null; // still loading

  if (!subscription) {
    return (
      <div className="glass" style={{
        padding: '16px', borderRadius: '16px', marginBottom: '16px',
        borderLeft: '3px solid var(--color-primary)',
      }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          No active subscription
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
          Choose a plan to give your team access to TolKI interpretation minutes.
        </p>
        <Link href="/settings/organization/billing">
          <button style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            backgroundColor: 'var(--color-primary)', color: '#fff',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            View plans
          </button>
        </Link>
      </div>
    );
  }

  const pct = org && org.totalMinutesAvailable > 0
    ? (org.minutesUsedThisCycle / org.totalMinutesAvailable) * 100
    : 0;

  if (pct >= 100) {
    return (
      <div className="glass" style={{
        padding: '16px', borderRadius: '16px', marginBottom: '16px',
        borderLeft: '3px solid var(--color-error)',
      }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-error)', marginBottom: '4px' }}>
          All minutes used
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Additional usage will be billed as overage. Upgrade your plan to add more minutes.
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
          Nearing your limit
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {(100 - pct).toFixed(0)}% of minutes remaining this cycle. Consider upgrading.
        </p>
      </div>
    );
  }

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { organization, membership } = useOrganization();

  // Convex queries — cast to any since types regenerate on next `convex dev`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convexOrg = useQuery(
    (api as any).organizations.getOrganizationByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = useQuery(
    (api as any).subscriptions.getSubscriptionByClerkOrgId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );

  const updatePoolMode = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).organizations.updateCreditPoolMode
  );

  const [isTogglingMode, setIsTogglingMode] = useState(false);

  const isAdmin = membership?.role === 'org:admin' || membership?.role === 'org:owner';
  const poolMode = convexOrg?.creditPoolMode ?? 'shared';

  const handlePoolModeToggle = async () => {
    if (!convexOrg || !isAdmin || isTogglingMode) return;
    setIsTogglingMode(true);
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

  // No org selected state
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
            aria-label="Go back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
            Organization
          </h1>
        </header>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 24px',
        }}>
          <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center', maxWidth: '340px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏢</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              No organization selected
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Create or join an organization to access team management features.
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
  const totalMin = subData?.totalMinutesAvailable ?? 0;
  const cycleEnd = subData?.currentBillingCycleEnd
    ? new Date(subData.currentBillingCycleEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
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
          aria-label="Go back">
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          Organization
        </h1>
        {/* Org switcher (compact) */}
        <div style={{ flexShrink: 0 }}>
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                rootBox: { display: 'flex', alignItems: 'center' },
                organizationSwitcherTrigger: {
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--glass-bg-subtle)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(8px)',
                  gap: '6px',
                },
                organizationSwitcherTriggerIcon: { color: 'var(--color-text-tertiary)' },
              },
            }}
          />
        </div>
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
        />

        {/* Subscription card */}
        {subscription !== undefined && (
          <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                Subscription
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
                    backgroundColor: STATUS_LABELS[subscription.status]?.color ?? 'var(--color-text-secondary)',
                    color: '#fff',
                  }}>
                    {STATUS_LABELS[subscription.status]?.label ?? subscription.status}
                  </span>
                </div>
              )}
            </div>

            {subscription && subData ? (
              <>
                <UsageBar used={usedMin} total={totalMin} />
                {subData.rolloverMinutes > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                    Includes {subData.rolloverMinutes} rollover minutes
                  </p>
                )}
                {cycleEnd && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Resets {cycleEnd}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                No active plan. Subscribe to allocate minutes to your team.
              </p>
            )}
          </div>
        )}

        {/* Credit pool mode */}
        {convexOrg && isAdmin && (
          <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', marginBottom: '4px' }}>
                Credit pool mode
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {poolMode === 'shared'
                  ? 'All members share one minute pool.'
                  : 'Each member has an individual minute allocation.'}
              </p>
            </div>
            <div className="glass-subtle" style={{ padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', display: 'block', marginBottom: '2px' }}>
                  {poolMode === 'shared' ? 'Shared pool' : 'Individual limits'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                  {poolMode === 'shared' ? 'Switch to set per-member limits' : 'Switch to share pool equally'}
                </span>
              </div>
              <button
                role="switch"
                aria-checked={poolMode === 'individual'}
                onClick={handlePoolModeToggle}
                disabled={isTogglingMode}
                aria-label="Toggle credit pool mode"
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
              Manage
            </h3>
          </div>

          <Link href="/settings/organization/members" className="w-full">
            <button className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{ padding: '14px 16px', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UsersIcon />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Members
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
                  Usage dashboard
                </span>
              </div>
              <ArrowIcon />
            </button>
          </Link>

          {isAdmin && (
            <button
              onClick={() => {
                // Redirect to Stripe billing portal via API route
                window.location.href = '/api/billing/portal?orgId=' + (convexOrg?._id ?? '');
              }}
              className="flex items-center justify-between transition-all active:scale-[0.98] w-full glass-subtle"
              style={{ padding: '14px 16px', borderRadius: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CreditCardIcon />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Billing portal
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
  );
}

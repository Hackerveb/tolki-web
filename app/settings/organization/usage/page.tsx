'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
import { useAutoSelectOrg } from '@/hooks/useAutoSelectOrg';

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline points="15 18 9 12 15 6" stroke="var(--color-text-primary)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(min: number): string {
  if (min < 60) return `${min.toFixed(0)} min`;
  return `${(min / 60).toFixed(1)} h`;
}

function formatDate(ts: number, dateLocale: string): string {
  return new Date(ts).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Usage progress bar ────────────────────────────────────────────────────────

function OrgUsageCard({
  minutesUsed,
  minutesTotal,
  rolloverMinutes,
  cycleStart,
  cycleEnd,
  tier,
  tt,
  dateLocale,
}: {
  minutesUsed: number;
  minutesTotal: number;
  rolloverMinutes: number;
  cycleStart?: number;
  cycleEnd?: number;
  tier?: string;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
  dateLocale: string;
}) {
  const pct = minutesTotal > 0 ? Math.min((minutesUsed / minutesTotal) * 100, 100) : 0;
  const remaining = Math.max(minutesTotal - minutesUsed, 0);
  const isOverage = minutesUsed > minutesTotal;

  const barColor =
    pct >= 100 ? 'var(--color-error)' :
    pct >= 80  ? 'var(--color-warning)' :
    'var(--color-success)';

  return (
    <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {tt('org.thisCycle')}
        </h3>
        {tier && (
          <span style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
            color: 'var(--color-text-tertiary)',
            padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--glass-bg-subtle)',
          }}>
            {tier}
          </span>
        )}
      </div>

      {/* Big stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {formatMinutes(minutesUsed)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', display: 'block', marginTop: '4px' }}>
            {tt('org.statUsed')}
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: isOverage ? 'var(--color-error)' : 'var(--color-success)', lineHeight: 1 }}>
            {isOverage ? '+' + formatMinutes(minutesUsed - minutesTotal) : formatMinutes(remaining)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', display: 'block', marginTop: '4px' }}>
            {isOverage ? tt('org.statOverage') : tt('org.statRemaining')}
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {formatMinutes(minutesTotal)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', display: 'block', marginTop: '4px' }}>
            {tt('org.statIncluded')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {tt('org.pctUsed', { pct: pct.toFixed(0) })}
          </span>
          {rolloverMinutes > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              {tt('org.rolloverStat', { n: formatMinutes(rolloverMinutes) })}
            </span>
          )}
        </div>
        <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--color-neutral-200)' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: '4px',
            backgroundColor: barColor, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Cycle dates */}
      {cycleStart && cycleEnd && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: '12px',
          paddingTop: '12px', borderTop: '1px solid var(--glass-border)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {tt('org.startedDate', { date: formatDate(cycleStart, dateLocale) })}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {tt('org.resetsDate', { date: formatDate(cycleEnd, dateLocale) })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Per-member usage row ─────────────────────────────────────────────────────

function MemberUsageRow({
  name,
  email,
  minutesUsed,
  allocation,
  maxMinutes,
}: {
  name: string;
  email: string;
  minutesUsed: number;
  allocation: number | null;
  maxMinutes: number;
}) {
  const pct = maxMinutes > 0 ? Math.min((minutesUsed / maxMinutes) * 100, 100) : 0;
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || email[0]?.toUpperCase() || '?';
  const barColor = allocation != null && minutesUsed >= allocation ? 'var(--color-error)' : 'var(--color-primary)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
        backgroundColor: 'var(--color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{initials}</span>
      </div>

      {/* Name + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            {name}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
            {formatMinutes(minutesUsed)}
            {allocation != null && ` / ${formatMinutes(allocation)}`}
          </span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', overflow: 'hidden', backgroundColor: 'var(--color-neutral-200)' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: '2px',
            backgroundColor: barColor, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Personal usage view (non-admin members) ────────────────────────────────

function PersonalUsageView({
  members,
  userId,
  poolMode,
  tt,
}: {
  members: MemberUsage[] | null | undefined;
  userId: string | undefined;
  poolMode: string;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
}) {
  const myData = members?.find((m) => m.userClerkId === userId);

  if (!myData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <div className="animate-spin" style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '3px solid var(--glass-border)', borderTopColor: 'var(--color-primary)',
        }} />
      </div>
    );
  }

  const hasAllocation = poolMode === 'individual' && myData.minuteAllocation != null;
  const pct = hasAllocation
    ? Math.min((myData.minutesUsedThisCycle / myData.minuteAllocation!) * 100, 100)
    : 0;
  const barColor = hasAllocation && myData.minutesUsedThisCycle >= myData.minuteAllocation!
    ? 'var(--color-error)'
    : pct >= 80
      ? 'var(--color-warning)'
      : 'var(--color-primary)';

  return (
    <div className="glass" style={{ padding: '20px', borderRadius: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', marginBottom: '20px' }}>
        {tt('org.yourUsage')}
      </h3>

      {/* Usage stat */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
          {formatMinutes(myData.minutesUsedThisCycle)}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', display: 'block', marginTop: '6px' }}>
          {tt('org.minutesUsedThisCycle')}
        </span>
      </div>

      {/* Progress bar (individual pool mode with allocation) */}
      {hasAllocation && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              {tt('org.pctUsed', { pct: pct.toFixed(0) })}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              {tt('org.ofAllocation', { n: formatMinutes(myData.minuteAllocation!) })}
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--color-neutral-200)' }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: '4px',
              backgroundColor: barColor, transition: 'width 0.4s ease',
            }} />
          </div>
        </>
      )}

      {/* Allocation label (individual mode) */}
      {poolMode === 'individual' && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {tt('org.yourAllocation')}{' '}
            <strong style={{ color: 'var(--color-text-secondary)' }}>
              {myData.minuteAllocation != null ? formatMinutes(myData.minuteAllocation) : tt('org.noLimit')}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface MemberUsage {
  userId: string;
  role: string;
  minutesUsedThisCycle: number;
  minuteAllocation: number | null;
  userName: string;
  userEmail: string;
  userClerkId: string;
}

export default function UsageDashboardPage() {
  const router = useRouter();
  const { isReady, hasOrg, organization: autoOrg } = useAutoSelectOrg();
  const { organization, membership, isLoaded } = useOrganization();
  const { user } = useUser();
  const { locale } = useLocale();
  const tt = useT(locale);
  const dateLocale = locale === 'nb' ? 'nb-NO' : 'en-US';
  const isAdmin = membership?.role === 'org:admin' || membership?.role === 'org:owner';

  // Redirect non-org users to settings after loading completes
  useEffect(() => {
    if (isReady && !hasOrg) {
      router.replace('/settings');
    }
  }, [isReady, hasOrg, router]);

  const convexOrg = useQuery(

    api.organizations.getOrganizationByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );

  const subscription = useQuery(

    api.subscriptions.getSubscriptionByClerkOrgId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );

  const members = useQuery(

    api.memberships.getOrgMembers,
    convexOrg?._id ? { orgId: convexOrg._id } : 'skip'
  ) as MemberUsage[] | null | undefined;

  const isLoading = !isReady || !isLoaded || (organization && (convexOrg === undefined || subscription === undefined));

  const subData = subscription?.org ?? convexOrg;
  const minutesUsed = subData?.minutesUsedThisCycle ?? 0;
  // Total budget = included minutes from plan + rollover (not the remaining pool)
  const minutesTotal = (subscription?.includedMinutes ?? 0) + (subData?.rolloverMinutes ?? 0);
  const rollover = subData?.rolloverMinutes ?? 0;

  // Sort members by usage descending
  const sortedMembers = members
    ? [...members].sort((a, b) => b.minutesUsedThisCycle - a.minutesUsedThisCycle)
    : [];

  const maxMemberUsage = sortedMembers.length > 0
    ? Math.max(...sortedMembers.map((m) => m.minuteAllocation ?? m.minutesUsedThisCycle), 1)
    : 1;

  return (
    <div className="glass-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header className="flex items-center glass-strong" style={{
        gap: '15px',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
        paddingBottom: '20px',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        borderBottom: '1px solid var(--glass-border)',
        borderRadius: 0, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.back()}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
          aria-label={tt('settings.goBack')}>
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          {tt('org.usageDashboard')}
        </h1>
      </header>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        paddingTop: '20px',
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <div className="animate-spin" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '3px solid var(--glass-border)', borderTopColor: 'var(--color-primary)',
            }} />
          </div>
        ) : !organization ? (
          <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>{tt('org.noOrgSelected')}</p>
          </div>
        ) : !convexOrg ? (
          <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              {tt('org.usageDataUnavailable')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {tt('org.usageDataSyncs')}
            </p>
          </div>
        ) : isAdmin ? (
          <>
            {/* Org-level usage */}
            <OrgUsageCard
              minutesUsed={minutesUsed}
              minutesTotal={minutesTotal}
              rolloverMinutes={rollover}
              cycleStart={subData?.currentBillingCycleStart}
              cycleEnd={subData?.currentBillingCycleEnd}
              tier={subscription?.tier}
              tt={tt}
              dateLocale={dateLocale}
            />

            {/* No subscription notice */}
            {!subscription && (
              <div className="glass" style={{
                padding: '16px', borderRadius: '16px', marginBottom: '16px',
                borderLeft: '3px solid var(--color-primary)',
              }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {tt('org.activateSubForMinutes')}
                </p>
              </div>
            )}

            {/* Per-member breakdown */}
            {sortedMembers.length > 0 && (
              <div className="glass" style={{ padding: '20px', borderRadius: '20px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', marginBottom: '20px' }}>
                  {tt('org.perMemberUsage')}
                </h3>
                {sortedMembers.map((m) => (
                  <MemberUsageRow
                    key={m.userId}
                    name={m.userName}
                    email={m.userEmail}
                    minutesUsed={m.minutesUsedThisCycle}
                    allocation={m.minuteAllocation}
                    maxMinutes={maxMemberUsage}
                  />
                ))}
              </div>
            )}

            {/* Overage note */}
            {minutesUsed > minutesTotal && minutesTotal > 0 && (
              <div className="glass" style={{
                padding: '16px', borderRadius: '16px', marginBottom: '16px',
                borderLeft: '3px solid var(--color-error)',
              }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-error)', marginBottom: '4px' }}>
                  {tt('org.overageActive')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {tt('org.overLimitDesc', { n: formatMinutes(minutesUsed - minutesTotal) })}
                  {subscription && ` ${tt('org.chargedAtRate', { rate: String(subscription.overageRateNok) })}`}
                </p>
              </div>
            )}
          </>
        ) : (
          <PersonalUsageView
            members={members}
            userId={user?.id}
            poolMode={convexOrg?.creditPoolMode ?? 'shared'}
            tt={tt}
          />
        )}
      </div>
    </div>
  );
}

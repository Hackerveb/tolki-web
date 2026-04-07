'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
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

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  owner: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' },
  admin: { bg: 'var(--color-primary-alpha)', color: 'var(--color-primary)' },
  member: { bg: 'rgba(100, 116, 139, 0.12)', color: 'var(--color-text-secondary)' },
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.member;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
      backgroundColor: style.bg, color: style.color,
    }}>
      {role}
    </span>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────

interface MemberData {
  membershipId: Id<'memberships'>;
  userId: Id<'users'>;
  role: 'owner' | 'admin' | 'member';
  minutesUsedThisCycle: number;
  minuteAllocation: number | null;
  joinedAt: number;
  userName: string;
  userEmail: string;
  userClerkId: string;
}

function MemberCard({
  member,
  isAdmin,
  poolMode,
  orgId,
  currentUserClerkId,
  onAllocationSave,
  onRemove,
  tt,
}: {
  member: MemberData;
  isAdmin: boolean;
  poolMode: string;
  orgId: Id<'organizations'>;
  currentUserClerkId?: string;
  onAllocationSave: (userId: Id<'users'>, minutes: number | undefined) => Promise<void>;
  onRemove: (member: MemberData) => void;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
}) {
  const [editingAllocation, setEditingAllocation] = useState(false);
  const [allocationInput, setAllocationInput] = useState(
    member.minuteAllocation?.toString() ?? ''
  );
  const [saving, setSaving] = useState(false);

  // Can remove: admin/owner can remove non-owner members (but not themselves)
  const canRemove = isAdmin && member.role !== 'owner' && member.userClerkId !== currentUserClerkId;

  const initials = member.userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || member.userEmail[0]?.toUpperCase() || '?';

  const handleSaveAllocation = async () => {
    setSaving(true);
    const val = allocationInput.trim() === '' ? undefined : parseInt(allocationInput, 10);
    try {
      await onAllocationSave(member.userId, isNaN(val as number) ? undefined : val);
      setEditingAllocation(false);
    } catch (e) {
      console.error('Failed to save allocation', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '16px', borderRadius: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          backgroundColor: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{initials}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.userName}
            </span>
            <RoleBadge role={member.role} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {member.userEmail}
          </span>
        </div>

        {/* Usage + Remove */}
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block' }}>
              {member.minutesUsedThisCycle.toFixed(0)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              {tt('org.minUsed')}
            </span>
          </div>
          {canRemove && (
            <button
              onClick={() => onRemove(member)}
              aria-label={tt('org.removeMember')}
              style={{
                padding: '4px 8px', borderRadius: '6px', border: 'none',
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {tt('org.removeMember')}
            </button>
          )}
        </div>
      </div>

      {/* Individual mode: allocation display (visible to all) + editor (admin only) */}
      {poolMode === 'individual' && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
          {editingAllocation && isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min={0}
                value={allocationInput}
                onChange={(e) => setAllocationInput(e.target.value)}
                placeholder="No limit"
                className="glass-input"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  fontSize: '13px', color: 'var(--color-text-primary)',
                  border: '1px solid var(--glass-input-border)',
                  backgroundColor: 'var(--glass-input-bg)',
                }}
              />
              <button onClick={handleSaveAllocation} disabled={saving} style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--color-primary)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}>
                {saving ? tt('org.saving') : tt('org.save')}
              </button>
              <button onClick={() => setEditingAllocation(false)} style={{
                padding: '8px 12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'transparent', color: 'var(--color-text-tertiary)',
                fontSize: '13px', cursor: 'pointer',
              }}>
                {tt('settings.cancel')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                {tt('org.allocation')}{' '}
                <strong style={{ color: 'var(--color-text-secondary)' }}>
                  {member.minuteAllocation != null ? `${member.minuteAllocation} min` : tt('org.noLimit')}
                </strong>
              </span>
              {isAdmin && (
                <button onClick={() => {
                  setAllocationInput(member.minuteAllocation?.toString() ?? '');
                  setEditingAllocation(true);
                }} style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none',
                  backgroundColor: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>
                  {tt('org.edit')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Individual mode: usage bar */}
      {poolMode === 'individual' && member.minuteAllocation != null && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ height: '4px', borderRadius: '2px', overflow: 'hidden', backgroundColor: 'var(--color-neutral-200)' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              backgroundColor: member.minutesUsedThisCycle >= member.minuteAllocation
                ? 'var(--color-error)' : 'var(--color-primary)',
              width: `${Math.min((member.minutesUsedThisCycle / member.minuteAllocation) * 100, 100)}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onInvite, tt }: {
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'org:member' | 'org:admin'>('org:member');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    try {
      await onInvite(email.trim(), role);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tt('org.failedToSendInvite'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="glass-strong glass-animate-in" style={{
        width: '100%', maxWidth: '480px',
        padding: '24px 24px max(24px, env(safe-area-inset-bottom)) 24px',
        borderRadius: '24px 24px 0 0',
        borderTop: '1px solid var(--glass-border)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {tt('org.inviteMember')}
          </h3>
          <button onClick={onClose} style={{
            width: '28px', height: '28px', borderRadius: '50%', border: 'none',
            backgroundColor: 'var(--glass-bg-subtle)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-tertiary)', fontSize: '16px',
          }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
            {tt('org.emailAddress')}
          </label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="glass-input"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              fontSize: '15px', color: 'var(--color-text-primary)',
              border: '1px solid var(--glass-input-border)',
              backgroundColor: 'var(--glass-input-bg)',
              boxSizing: 'border-box', marginBottom: '16px',
            }}
          />
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
            {tt('org.role')}
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {(['org:member', 'org:admin'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                backgroundColor: role === r ? 'var(--color-primary)' : 'var(--glass-bg-subtle)',
                color: role === r ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 600,
                border: `1px solid ${role === r ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                transition: 'all 0.15s ease',
              }}>
                {r === 'org:member' ? tt('org.roleMember') : tt('org.roleAdmin')}
              </button>
            ))}
          </div>
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '12px' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={sending || !email.trim()} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            backgroundColor: 'var(--color-primary)', color: '#fff',
            fontSize: '15px', fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending || !email.trim() ? 0.6 : 1,
          }}>
            {sending ? tt('org.sendingInvite') : tt('org.sendInvite')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter();
  const { organization, membership, isLoaded } = useOrganization();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberData | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { locale } = useLocale();
  const tt = useT(locale);

  // Convex data
  const convexOrg = useQuery(

    api.organizations.getOrganizationByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );
  const members = useQuery(

    api.memberships.getOrgMembers,
    convexOrg?._id ? { orgId: convexOrg._id } : 'skip'
  ) as MemberData[] | null | undefined;

  const setMemberAllocation = useMutation(

    api.memberships.setMemberAllocation
  );

  const isAdmin = membership?.role === 'org:admin' || membership?.role === 'org:owner';
  const poolMode = convexOrg?.creditPoolMode ?? 'shared';

  const handleInvite = async (email: string, role: string) => {
    if (!organization) return;
    await organization.inviteMember({ emailAddress: email, role });
  };

  const handleAllocationSave = async (userId: Id<'users'>, minutes: number | undefined) => {
    if (!convexOrg) return;
    await setMemberAllocation({ orgId: convexOrg._id, targetUserId: userId, minuteAllocation: minutes });
  };

  const handleRemoveMember = async () => {
    if (!organization || !memberToRemove) return;
    setIsRemoving(true);
    try {
      await organization.removeMember(memberToRemove.userClerkId);
    } catch (e) {
      console.error('Failed to remove member:', e);
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  // Trigger sync if org exists in Clerk but not in Convex (webhook missed)
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);
  React.useEffect(() => {
    if (organization && convexOrg === null && !isSyncing && !syncAttempted) {
      setIsSyncing(true);
      fetch('/api/sync-memberships', { method: 'POST' })
        .catch(() => {})
        .finally(() => {
          setIsSyncing(false);
          setSyncAttempted(true);
        });
    }
  }, [organization, convexOrg, isSyncing, syncAttempted]);

  const isLoading = !isLoaded || (organization && convexOrg === undefined) || isSyncing;

  // Get current user's clerkId for self-removal prevention
  const currentUserClerkId = membership?.publicUserData?.userId;

  return (
    <>
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} onInvite={handleInvite} tt={tt} />
      )}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        title={tt('org.confirmRemoveTitle')}
        message={tt('org.confirmRemoveMessage', { name: memberToRemove?.userName || memberToRemove?.userEmail || '' })}
        confirmLabel={isRemoving ? '...' : tt('org.removeMember')}
        cancelLabel={tt('settings.cancel')}
        isDangerous
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
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
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
            aria-label={tt('settings.goBack')}>
            <BackIcon />
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
            {tt('org.members')}
          </h1>
          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              aria-label={tt('org.inviteMember')}
              style={{
                padding: '8px 14px', borderRadius: '10px', border: 'none',
                backgroundColor: 'var(--color-primary)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <PlusIcon />
              {tt('org.invite')}
            </button>
          )}
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
          {/* Pool mode info */}
          {poolMode === 'individual' && (
            <div className="glass-subtle" style={{ padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="1.5" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {tt('org.individualModeInfo')}
              </p>
            </div>
          )}

          {/* Section header */}
          <p style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)',
            marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            {members
              ? `${members.length} ${members.length !== 1 ? tt('org.memberPlural') : tt('org.memberSingular')}`
              : tt('org.members')}
          </p>

          {isLoading || (convexOrg && members === undefined) ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="animate-spin" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid var(--glass-border)',
                borderTopColor: 'var(--color-primary)',
              }} />
            </div>
          ) : !organization || (organization && !convexOrg) ? (
            <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                {tt('org.noOrgSelected')}
              </p>
            </div>
          ) : !members || members.length === 0 ? (
            <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                {tt('org.noMembers')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {tt('org.inviteTeam')}
              </p>
            </div>
          ) : (
            members.map((member) => (
              <MemberCard
                key={String(member.membershipId)}
                member={member}
                isAdmin={isAdmin}
                poolMode={poolMode}
                orgId={convexOrg!._id}
                currentUserClerkId={currentUserClerkId}
                onAllocationSave={handleAllocationSave}
                onRemove={setMemberToRemove}
                tt={tt}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

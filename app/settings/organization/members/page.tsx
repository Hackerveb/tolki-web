'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

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
  onAllocationSave,
}: {
  member: MemberData;
  isAdmin: boolean;
  poolMode: string;
  orgId: Id<'organizations'>;
  onAllocationSave: (userId: Id<'users'>, minutes: number | undefined) => Promise<void>;
}) {
  const [editingAllocation, setEditingAllocation] = useState(false);
  const [allocationInput, setAllocationInput] = useState(
    member.minuteAllocation?.toString() ?? ''
  );
  const [saving, setSaving] = useState(false);

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

        {/* Usage */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block' }}>
            {member.minutesUsedThisCycle.toFixed(0)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            min used
          </span>
        </div>
      </div>

      {/* Individual mode: allocation editor */}
      {poolMode === 'individual' && isAdmin && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
          {editingAllocation ? (
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
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingAllocation(false)} style={{
                padding: '8px 12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'transparent', color: 'var(--color-text-tertiary)',
                fontSize: '13px', cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                Allocation:{' '}
                <strong style={{ color: 'var(--color-text-secondary)' }}>
                  {member.minuteAllocation != null ? `${member.minuteAllocation} min` : 'No limit'}
                </strong>
              </span>
              <button onClick={() => {
                setAllocationInput(member.minuteAllocation?.toString() ?? '');
                setEditingAllocation(true);
              }} style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                backgroundColor: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>
                Edit
              </button>
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

function InviteModal({ onClose, onInvite }: {
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
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
      setError(err instanceof Error ? err.message : 'Failed to send invite');
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
            Invite member
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
            Email address
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
            Role
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
                {r === 'org:member' ? 'Member' : 'Admin'}
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
            {sending ? 'Sending invite…' : 'Send invite'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter();
  const { organization, membership } = useOrganization();
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Convex data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convexOrg = useQuery(
    (api as any).organizations.getOrganizationByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : 'skip'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = useQuery(
    (api as any).memberships.getOrgMembers,
    convexOrg?._id ? { orgId: convexOrg._id } : 'skip'
  ) as MemberData[] | null | undefined;

  const setMemberAllocation = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).memberships.setMemberAllocation
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

  const isLoading = organization && members === undefined;

  return (
    <>
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} onInvite={handleInvite} />
      )}
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
            aria-label="Go back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
            Members
          </h1>
          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              aria-label="Invite member"
              style={{
                padding: '8px 14px', borderRadius: '10px', border: 'none',
                backgroundColor: 'var(--color-primary)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <PlusIcon />
              Invite
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
                Individual mode — set per-member allocations below.
              </p>
            </div>
          )}

          {/* Section header */}
          <p style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)',
            marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            {members ? `${members.length} member${members.length !== 1 ? 's' : ''}` : 'Members'}
          </p>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="animate-spin" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid var(--glass-border)',
                borderTopColor: 'var(--color-primary)',
              }} />
            </div>
          ) : !organization ? (
            <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                No organization selected.
              </p>
            </div>
          ) : !members || members.length === 0 ? (
            <div className="glass" style={{ padding: '32px 24px', borderRadius: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                No members yet
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Invite your team to get started.
              </p>
            </div>
          ) : (
            members.map((member) => (
              <MemberCard
                key={String(member.membershipId)}
                member={member}
                isAdmin={isAdmin}
                poolMode={poolMode}
                orgId={convexOrg?._id}
                onAllocationSave={handleAllocationSave}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

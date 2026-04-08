'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/lib/i18n';
import { useAutoSelectOrg } from '@/hooks/useAutoSelectOrg';
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
  organization,
  locale,
  selectionMode,
  isSelected,
  onToggleSelect,
  onAllocationSave,
  onRemove,
  onRoleChange,
  tt,
}: {
  member: MemberData;
  isAdmin: boolean;
  poolMode: string;
  orgId: Id<'organizations'>;
  currentUserClerkId?: string;
  organization: ReturnType<typeof useOrganization>['organization'];
  locale: string;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (member: MemberData) => void;
  onAllocationSave: (userId: Id<'users'>, minutes: number | undefined) => Promise<void>;
  onRemove: (member: MemberData) => void;
  onRoleChange: (member: MemberData, newRole: 'admin' | 'member') => Promise<void>;
  tt: (key: Parameters<ReturnType<typeof useT>>[0], params?: Record<string, string>) => string;
}) {
  const [editingAllocation, setEditingAllocation] = useState(false);
  const [allocationInput, setAllocationInput] = useState(
    member.minuteAllocation?.toString() ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [pendingRole, setPendingRole] = useState<'admin' | 'member' | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  // Can remove/change: admin/owner can act on non-owner members (but not themselves)
  const canActOn = isAdmin && member.role !== 'owner' && member.userClerkId !== currentUserClerkId;
  const canRemove = canActOn;
  const canChangeRole = canActOn;
  const canSelect = canActOn;

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
    <div
      className="glass"
      style={{
        padding: '16px', borderRadius: '16px', marginBottom: '12px',
        outline: isSelected ? '2px solid var(--color-primary)' : undefined,
        cursor: selectionMode && canSelect ? 'pointer' : undefined,
      }}
      onClick={selectionMode && canSelect ? () => onToggleSelect(member) : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Checkbox in selection mode */}
        {selectionMode && (
          <div style={{
            width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
            border: `2px solid ${canSelect ? (isSelected ? 'var(--color-primary)' : 'var(--glass-border)') : 'var(--glass-border)'}`,
            backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: canSelect ? 1 : 0.3,
            transition: 'all 0.15s ease',
          }}>
            {isSelected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}

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
            {canChangeRole ? (
              <select
                value={member.role}
                onChange={(e) => {
                  const newRole = e.target.value as 'admin' | 'member';
                  if (newRole !== member.role) setPendingRole(newRole);
                }}
                style={{
                  padding: '2px 6px', borderRadius: '6px',
                  fontSize: '11px', fontWeight: 600,
                  backgroundColor: ROLE_STYLES[member.role]?.bg ?? ROLE_STYLES.member.bg,
                  color: ROLE_STYLES[member.role]?.color ?? ROLE_STYLES.member.color,
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer', appearance: 'auto',
                }}
              >
                <option value="admin">{locale === 'nb' ? 'Admin' : 'Admin'}</option>
                <option value="member">{locale === 'nb' ? 'Medlem' : 'Member'}</option>
              </select>
            ) : (
              <RoleBadge role={member.role} />
            )}
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

      {/* Role change confirmation */}
      <ConfirmDialog
        isOpen={!!pendingRole}
        title={locale === 'nb' ? 'Endre rolle' : 'Change role'}
        message={locale === 'nb'
          ? `Endre rollen til ${member.userName || member.userEmail} til ${pendingRole === 'admin' ? 'admin' : 'medlem'}?`
          : `Change ${member.userName || member.userEmail}'s role to ${pendingRole}?`}
        confirmLabel={changingRole ? '...' : (locale === 'nb' ? 'Endre' : 'Change')}
        cancelLabel={tt('settings.cancel')}
        onConfirm={async () => {
          if (!pendingRole) return;
          setChangingRole(true);
          try {
            await onRoleChange(member, pendingRole);
          } catch (e) {
            console.error('Failed to change role', e);
          } finally {
            setChangingRole(false);
            setPendingRole(null);
          }
        }}
        onCancel={() => setPendingRole(null)}
      />
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

// ─── Relative time helper ────────────────────────────────────────────────────

function relativeTime(date: Date, locale: string): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const nb = locale === 'nb';
  if (days > 0) return nb ? `${days} ${days === 1 ? 'dag' : 'dager'} siden` : `${days} ${days === 1 ? 'day' : 'days'} ago`;
  if (hours > 0) return nb ? `${hours} ${hours === 1 ? 'time' : 'timer'} siden` : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (minutes > 0) return nb ? `${minutes} ${minutes === 1 ? 'minutt' : 'minutter'} siden` : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  return nb ? 'akkurat nå' : 'just now';
}

// ─── Pending invitations ─────────────────────────────────────────────────────

function PendingInvitations({
  organization,
  locale,
}: {
  organization: NonNullable<ReturnType<typeof useOrganization>['organization']>;
  locale: string;
}) {
  const [invitations, setInvitations] = useState<
    { id: string; emailAddress: string; role: string; createdAt: Date; revoke: () => Promise<unknown> }[]
  >([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const { data } = await organization.getInvitations({ status: ['pending'] });
      setInvitations(data ?? []);
    } catch (e) {
      console.error('Failed to fetch invitations', e);
    }
  };

  useEffect(() => {
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  const handleRevoke = async (inv: (typeof invitations)[number]) => {
    setRevoking(inv.id);
    setConfirmId(null);
    try {
      await inv.revoke();
      await fetchInvitations();
    } catch (e) {
      console.error('Failed to revoke invitation', e);
    } finally {
      setRevoking(null);
    }
  };

  if (invitations.length === 0) return null;

  const nb = locale === 'nb';
  const confirmInv = invitations.find((i) => i.id === confirmId);

  return (
    <>
      <ConfirmDialog
        isOpen={!!confirmId}
        title={nb ? 'Tilbakekall invitasjon' : 'Revoke invitation'}
        message={
          nb
            ? `Er du sikker på at du vil tilbakekalle invitasjonen til ${confirmInv?.emailAddress ?? ''}?`
            : `Are you sure you want to revoke the invitation to ${confirmInv?.emailAddress ?? ''}?`
        }
        confirmLabel={revoking ? '...' : nb ? 'Tilbakekall' : 'Revoke'}
        cancelLabel={nb ? 'Avbryt' : 'Cancel'}
        isDangerous
        onConfirm={() => confirmInv && handleRevoke(confirmInv)}
        onCancel={() => setConfirmId(null)}
      />
      <div style={{ marginBottom: '16px' }}>
        <p style={{
          fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)',
          marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px',
        }}>
          {nb ? 'Ventende invitasjoner' : 'Pending invitations'}
        </p>
        <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {invitations.map((inv, i) => (
            <div
              key={inv.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderTop: i > 0 ? '1px solid var(--glass-border)' : undefined,
              }}
            >
              {/* Email icon */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                backgroundColor: 'rgba(100, 116, 139, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="var(--color-text-tertiary)" strokeWidth="1.5" />
                  <polyline points="2 4 12 13 22 4" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {inv.emailAddress}
                  </span>
                  <RoleBadge role={inv.role.replace('org:', '')} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  {relativeTime(new Date(inv.createdAt), locale)}
                </span>
              </div>

              {/* Revoke */}
              <button
                onClick={() => setConfirmId(inv.id)}
                disabled={revoking === inv.id}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                  fontSize: '11px', fontWeight: 600,
                  cursor: revoking === inv.id ? 'not-allowed' : 'pointer',
                  opacity: revoking === inv.id ? 0.5 : 1,
                }}
              >
                {revoking === inv.id ? '...' : nb ? 'Tilbakekall' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter();
  const { isReady, hasOrg, organization: autoOrg } = useAutoSelectOrg();
  const { organization, membership, isLoaded } = useOrganization();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberData | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'remove' | 'role' | 'allocation' | null>(null);
  const [bulkRole, setBulkRole] = useState<'admin' | 'member'>('member');
  const [bulkAllocation, setBulkAllocation] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const { locale } = useLocale();
  const tt = useT(locale);
  const nb = locale === 'nb';

  // Redirect non-org users to settings after loading completes
  useEffect(() => {
    if (isReady && !hasOrg) {
      router.replace('/settings');
    }
  }, [isReady, hasOrg, router]);

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
  const updateMemberRole = useMutation(
    api.memberships.updateMemberRole
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

  const handleRoleChange = async (member: MemberData, newRole: 'admin' | 'member') => {
    if (!convexOrg || !organization) return;
    // Clerk first (auth source of truth), then sync to Convex
    const clerkRole = newRole === 'admin' ? 'org:admin' : 'org:member';
    await organization.updateMember({ userId: member.userClerkId, role: clerkRole });
    await updateMemberRole({ orgId: convexOrg._id, targetUserId: member.userId, role: newRole });
  };

  const toggleSelect = (member: MemberData) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(member.membershipId);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectedMembers = members?.filter((m) => selectedIds.has(String(m.membershipId))) ?? [];

  const handleBulkRemove = async () => {
    if (!organization || selectedMembers.length === 0) return;
    setBulkProcessing(true);
    const errors: string[] = [];
    for (const m of selectedMembers) {
      try {
        await organization.removeMember(m.userClerkId);
      } catch (e) {
        errors.push(m.userName || m.userEmail);
      }
    }
    if (errors.length > 0) console.error('Failed to remove:', errors.join(', '));
    setBulkProcessing(false);
    setBulkAction(null);
    exitSelectionMode();
  };

  const handleBulkRoleChange = async () => {
    if (!convexOrg || !organization || selectedMembers.length === 0) return;
    setBulkProcessing(true);
    const errors: string[] = [];
    for (const m of selectedMembers) {
      try {
        // Clerk first (auth source of truth), then sync to Convex
        const clerkRole = bulkRole === 'admin' ? 'org:admin' : 'org:member';
        await organization.updateMember({ userId: m.userClerkId, role: clerkRole });
        await updateMemberRole({ orgId: convexOrg._id, targetUserId: m.userId, role: bulkRole });
      } catch (e) {
        errors.push(m.userName || m.userEmail);
      }
    }
    if (errors.length > 0) console.error('Failed to change role for:', errors.join(', '));
    setBulkProcessing(false);
    setBulkAction(null);
    exitSelectionMode();
  };

  const handleBulkAllocation = async () => {
    if (!convexOrg || selectedMembers.length === 0) return;
    setBulkProcessing(true);
    const val = bulkAllocation.trim() === '' ? undefined : parseInt(bulkAllocation, 10);
    const minutes = isNaN(val as number) ? undefined : val;
    const errors: string[] = [];
    for (const m of selectedMembers) {
      try {
        await setMemberAllocation({ orgId: convexOrg._id, targetUserId: m.userId, minuteAllocation: minutes });
      } catch (e) {
        errors.push(m.userName || m.userEmail);
      }
    }
    if (errors.length > 0) console.error('Failed to set allocation for:', errors.join(', '));
    setBulkProcessing(false);
    setBulkAction(null);
    setBulkAllocation('');
    exitSelectionMode();
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

  const isLoading = !isLoaded || !isReady || (organization && convexOrg === undefined);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectionMode ? (
                <button
                  onClick={exitSelectionMode}
                  className="transition-all hover:scale-105 active:scale-95"
                  style={{
                    padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)',
                    backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {tt('settings.cancel')}
                </button>
              ) : (
                <>
                  {members && members.length > 1 && (
                    <button
                      onClick={() => setSelectionMode(true)}
                      className="transition-all hover:scale-105 active:scale-95"
                      style={{
                        padding: '8px 14px', borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {nb ? 'Velg' : 'Select'}
                    </button>
                  )}
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
                </>
              )}
            </div>
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

          {/* Pending invitations (admin only) */}
          {isAdmin && organization && (
            <PendingInvitations organization={organization} locale={locale} />
          )}

          {isLoading || (convexOrg && members === undefined) || (!organization && hasOrg) ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="animate-spin" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid var(--glass-border)',
                borderTopColor: 'var(--color-primary)',
              }} />
            </div>
          ) : !organization || !convexOrg ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="animate-spin" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid var(--glass-border)',
                borderTopColor: 'var(--color-primary)',
              }} />
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
                organization={organization}
                locale={locale}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(String(member.membershipId))}
                onToggleSelect={toggleSelect}
                onAllocationSave={handleAllocationSave}
                onRemove={setMemberToRemove}
                onRoleChange={handleRoleChange}
                tt={tt}
              />
            ))
          )}

          {/* Spacer so content doesn't hide behind floating bar */}
          {selectionMode && selectedIds.size > 0 && <div style={{ height: '80px' }} />}
        </div>

        {/* Floating bulk action bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="glass-strong" style={{
            position: 'fixed', bottom: 'max(20px, env(safe-area-inset-bottom))',
            left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 40px)', maxWidth: '480px',
            padding: '12px 16px', borderRadius: '16px',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: '10px',
            zIndex: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', flexShrink: 0 }}>
              {selectedIds.size} {nb ? 'valgt' : 'selected'}
            </span>
            <div style={{ flex: 1 }} />
            {poolMode === 'individual' && (
              <button
                onClick={() => { setBulkAllocation(''); setBulkAction('allocation'); }}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none',
                  backgroundColor: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {nb ? 'Tildeling' : 'Allocation'}
              </button>
            )}
            <button
              onClick={() => setBulkAction('role')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {nb ? 'Sett rolle' : 'Set role'}
            </button>
            <button
              onClick={() => setBulkAction('remove')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {tt('org.removeMember')}
            </button>
          </div>
        )}
      </div>

      {/* Bulk remove confirmation */}
      <ConfirmDialog
        isOpen={bulkAction === 'remove'}
        title={nb ? 'Fjern medlemmer' : 'Remove members'}
        message={nb
          ? `Er du sikker på at du vil fjerne ${selectedIds.size} ${selectedIds.size === 1 ? 'medlem' : 'medlemmer'}?`
          : `Are you sure you want to remove ${selectedIds.size} ${selectedIds.size === 1 ? 'member' : 'members'}?`}
        confirmLabel={bulkProcessing ? '...' : (nb ? 'Fjern' : 'Remove')}
        cancelLabel={tt('settings.cancel')}
        isDangerous
        onConfirm={handleBulkRemove}
        onCancel={() => setBulkAction(null)}
      />

      {/* Bulk role change modal */}
      {bulkAction === 'role' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }} onClick={() => setBulkAction(null)}>
          <div className="glass-strong glass-animate-in" style={{
            width: '100%', maxWidth: '480px',
            padding: '24px 24px max(24px, env(safe-area-inset-bottom)) 24px',
            borderRadius: '24px 24px 0 0',
            borderTop: '1px solid var(--glass-border)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {nb ? 'Sett rolle' : 'Set role'}
              </h3>
              <button onClick={() => setBulkAction(null)} style={{
                width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                backgroundColor: 'var(--glass-bg-subtle)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-tertiary)', fontSize: '16px',
              }}>x</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              {nb
                ? `Endre rollen for ${selectedIds.size} ${selectedIds.size === 1 ? 'medlem' : 'medlemmer'} til:`
                : `Change the role of ${selectedIds.size} ${selectedIds.size === 1 ? 'member' : 'members'} to:`}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {(['admin', 'member'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setBulkRole(r)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                  backgroundColor: bulkRole === r ? 'var(--color-primary)' : 'var(--glass-bg-subtle)',
                  color: bulkRole === r ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: '13px', fontWeight: 600,
                  border: `1px solid ${bulkRole === r ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                  transition: 'all 0.15s ease',
                }}>
                  {r === 'member' ? (nb ? 'Medlem' : 'Member') : 'Admin'}
                </button>
              ))}
            </div>
            <button
              onClick={handleBulkRoleChange}
              disabled={bulkProcessing}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                backgroundColor: 'var(--color-primary)', color: '#fff',
                fontSize: '15px', fontWeight: 600,
                cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                opacity: bulkProcessing ? 0.6 : 1,
              }}
            >
              {bulkProcessing ? '...' : (nb ? 'Endre rolle' : 'Change role')}
            </button>
          </div>
        </div>
      )}

      {/* Bulk allocation modal */}
      {bulkAction === 'allocation' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }} onClick={() => setBulkAction(null)}>
          <div className="glass-strong glass-animate-in" style={{
            width: '100%', maxWidth: '480px',
            padding: '24px 24px max(24px, env(safe-area-inset-bottom)) 24px',
            borderRadius: '24px 24px 0 0',
            borderTop: '1px solid var(--glass-border)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {nb ? 'Sett tildeling' : 'Set allocation'}
              </h3>
              <button onClick={() => setBulkAction(null)} style={{
                width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                backgroundColor: 'var(--glass-bg-subtle)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-tertiary)', fontSize: '16px',
              }}>x</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              {nb
                ? `Sett minuttildeling for ${selectedIds.size} ${selectedIds.size === 1 ? 'medlem' : 'medlemmer'}:`
                : `Set minute allocation for ${selectedIds.size} ${selectedIds.size === 1 ? 'member' : 'members'}:`}
            </p>
            <input
              type="number"
              min={0}
              value={bulkAllocation}
              onChange={(e) => setBulkAllocation(e.target.value)}
              placeholder={nb ? 'Ingen grense' : 'No limit'}
              autoFocus
              className="glass-input"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                fontSize: '15px', color: 'var(--color-text-primary)',
                border: '1px solid var(--glass-input-border)',
                backgroundColor: 'var(--glass-input-bg)',
                boxSizing: 'border-box', marginBottom: '20px',
              }}
            />
            <button
              onClick={handleBulkAllocation}
              disabled={bulkProcessing}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                backgroundColor: 'var(--color-primary)', color: '#fff',
                fontSize: '15px', fontWeight: 600,
                cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                opacity: bulkProcessing ? 0.6 : 1,
              }}
            >
              {bulkProcessing ? '...' : (nb ? 'Lagre' : 'Save')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

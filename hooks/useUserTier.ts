'use client';

import { useOrganization } from '@clerk/nextjs';

export type UserTier = 'org_admin' | 'org_member' | 'private';

export interface UserTierResult {
  tier: UserTier;
  orgId?: string;
  orgName?: string;
  isLoaded: boolean;
}

/**
 * Determines the current user's effective tier based on their Clerk org context.
 * - org_admin: user is in an org with role org:admin or org:owner
 * - org_member: user is in an org with role org:member
 * - private: user has no active org context
 */
export function useUserTier(): UserTierResult {
  const { organization, membership, isLoaded } = useOrganization();

  if (!isLoaded) {
    return { tier: 'private', isLoaded: false };
  }

  if (!organization) {
    return { tier: 'private', isLoaded: true };
  }

  if (membership?.role === 'org:admin' || membership?.role === 'org:owner') {
    return {
      tier: 'org_admin',
      orgId: organization.id,
      orgName: organization.name,
      isLoaded: true,
    };
  }

  return {
    tier: 'org_member',
    orgId: organization.id,
    orgName: organization.name,
    isLoaded: true,
  };
}

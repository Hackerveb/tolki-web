import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

// fetchQuery/fetchMutation do NOT auto-read CONVEX_DEPLOY_KEY; we must pass it
// explicitly as adminToken so internal functions are authorized.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convexAdminOpts = { adminToken: process.env.CONVEX_DEPLOY_KEY! } as any;

// fetchQuery/fetchMutation require `as any` for internal function references
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalOrgs = (internal as any).organizations;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalMembers = (internal as any).memberships;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalUsers = (internal as any).users;

// Map Clerk role strings to our union type
function mapRole(clerkRole: string): 'owner' | 'admin' | 'member' {
  if (clerkRole === 'org:admin') return 'admin';
  if (clerkRole === 'org:member' || clerkRole === 'basic_member') return 'member';
  if (clerkRole.includes('owner')) return 'owner';
  if (clerkRole.includes('admin')) return 'admin';
  return 'member';
}

/**
 * POST /api/sync-memberships
 *
 * Called after a user signs in / is created in Convex to sync any Clerk
 * org memberships that may have arrived before the user existed in Convex
 * (e.g. user accepted an invite before their first sign-in).
 */
export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's Clerk org memberships
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId: clerkUserId,
    });

    if (!memberships.data || memberships.data.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    // Resolve the Convex user — create if missing (self-healing when client auth is misconfigured)
    let convexUser = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId }, convexAdminOpts);
    if (!convexUser) {
      // User not in Convex yet — create via internal mutation (no client auth needed)
      const clerkUser = await client.users.getUser(clerkUserId);
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';

      await fetchMutation(internalUsers.upsertUser, {
        clerkId: clerkUserId,
        email,
        name,
      }, convexAdminOpts);

      convexUser = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId }, convexAdminOpts);
      if (!convexUser) {
        console.error('Failed to create user in Convex for clerkId:', clerkUserId);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }

    let synced = 0;

    for (const membership of memberships.data) {
      const clerkOrgId = membership.organization.id;

      // Resolve the Convex org — create it if missing (self-healing for orgs
      // created before the webhook was configured)
      let org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId }, convexAdminOpts);
      if (!org) {
        const clerkOrg = membership.organization;
        await fetchMutation(internalOrgs.syncOrganization, {
          clerkOrgId: clerkOrg.id,
          name: clerkOrg.name,
          slug: clerkOrg.slug,
        }, convexAdminOpts);
        org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId }, convexAdminOpts);
        if (!org) {
          console.error(`Failed to create org for clerkOrgId: ${clerkOrgId}`);
          continue;
        }
      }

      // Upsert membership (addMember is idempotent)
      await fetchMutation(internalMembers.addMember, {
        orgId: org._id,
        userId: convexUser._id,
        clerkMembershipId: membership.id,
        role: mapRole(membership.role),
      }, convexAdminOpts);
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error('Error syncing memberships:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

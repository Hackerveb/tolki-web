import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

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

    // Resolve the Convex user
    const convexUser = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId });
    if (!convexUser) {
      // User not yet in Convex — this shouldn't happen since we call this after createOrUpdateUser
      return NextResponse.json({ synced: 0 });
    }

    let synced = 0;

    for (const membership of memberships.data) {
      const clerkOrgId = membership.organization.id;

      // Resolve or create the Convex org
      let org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
      if (!org) {
        // Org not in Convex yet — fetch full org details from Clerk and create it
        try {
          const clerkOrg = await client.organizations.getOrganization({ organizationId: clerkOrgId });
          await fetchMutation(internalOrgs.syncOrganization, {
            clerkOrgId: clerkOrg.id,
            name: clerkOrg.name,
            slug: clerkOrg.slug || clerkOrg.id,
          });
          org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
        } catch (e) {
          console.error(`Failed to sync org ${clerkOrgId}:`, e);
        }
        if (!org) continue;
      }

      // Upsert membership (addMember is idempotent)
      await fetchMutation(internalMembers.addMember, {
        orgId: org._id,
        userId: convexUser._id,
        clerkMembershipId: membership.id,
        role: mapRole(membership.role),
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error('Error syncing memberships:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

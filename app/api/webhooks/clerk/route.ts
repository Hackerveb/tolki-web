import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

// ─── Internal function references ────────────────────────────────────────────
// fetchQuery/fetchMutation require `as any` for internal function references
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalOrgs = (internal as any).organizations;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalMembers = (internal as any).memberships;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalUsers = (internal as any).users;

// ─── Clerk event payload types ───────────────────────────────────────────────
interface ClerkOrganizationData {
  id: string;
  name: string;
  slug: string;
}

interface ClerkMembershipData {
  id: string;
  organization: { id: string };
  public_user_data: { user_id: string };
  role: string;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkOrganizationData | ClerkMembershipData;
}

// Map Clerk role strings to our union type
function mapRole(clerkRole: string): 'owner' | 'admin' | 'member' {
  if (clerkRole === 'org:admin') return 'admin';
  // Clerk's "basic_member" or any "org:member" variant
  if (clerkRole === 'org:member' || clerkRole === 'basic_member') return 'member';
  // Fallback: treat unknown roles as member unless it looks like owner
  if (clerkRole.includes('owner')) return 'owner';
  if (clerkRole.includes('admin')) return 'admin';
  return 'member';
}

export async function POST(request: NextRequest) {
  console.log('=== CLERK WEBHOOK RECEIVED ===');

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ CLERK_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Read raw body for signature verification
  const body = await request.text();
  const headerPayload = await headers();

  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('❌ Missing svix headers');
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Organization events ──────────────────────────────────────────────
      case 'organization.created':
      case 'organization.updated': {
        const org = event.data as ClerkOrganizationData;
        console.log(`🏢 ${event.type}: ${org.id} "${org.name}"`);
        await fetchMutation(internalOrgs.syncOrganization, {
          clerkOrgId: org.id,
          name: org.name,
          slug: org.slug,
        });
        console.log(`✅ Org synced: ${org.id}`);
        break;
      }

      case 'organization.deleted': {
        const org = event.data as ClerkOrganizationData;
        console.log(`🗑️ organization.deleted: ${org.id}`);
        await fetchMutation(internalOrgs.archiveOrganization, {
          clerkOrgId: org.id,
        });
        console.log(`✅ Org archived: ${org.id}`);
        break;
      }

      // ── Membership events ────────────────────────────────────────────────
      case 'organizationMembership.created':
      case 'organizationMembership.updated': {
        const membership = event.data as ClerkMembershipData;
        const clerkOrgId = membership.organization.id;
        const clerkUserId = membership.public_user_data.user_id;
        console.log(`👤 ${event.type}: user=${clerkUserId} org=${clerkOrgId} role=${membership.role}`);

        // Resolve Convex IDs
        const org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
        if (!org) {
          console.error(`❌ Org not found for clerkOrgId: ${clerkOrgId}. Triggering org sync first.`);
          // Org may not be synced yet; skip and let retry handle it
          return NextResponse.json({ error: 'Org not synced yet' }, { status: 404 });
        }

        const user = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId });
        if (!user) {
          console.warn(`⚠️ User not found for clerkId: ${clerkUserId} — skipping membership sync`);
          // User hasn't signed in yet; Clerk may fire before first login. Skip silently.
          break;
        }

        await fetchMutation(internalMembers.addMember, {
          orgId: org._id,
          userId: user._id,
          clerkMembershipId: membership.id,
          role: mapRole(membership.role),
        });
        console.log(`✅ Membership synced: user=${clerkUserId} org=${clerkOrgId} role=${membership.role}`);
        break;
      }

      case 'organizationMembership.deleted': {
        const membership = event.data as ClerkMembershipData;
        const clerkOrgId = membership.organization.id;
        const clerkUserId = membership.public_user_data.user_id;
        console.log(`❌ organizationMembership.deleted: user=${clerkUserId} org=${clerkOrgId}`);

        const org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
        if (!org) {
          console.warn(`⚠️ Org not found for clerkOrgId: ${clerkOrgId} — skipping membership removal`);
          break;
        }

        const user = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId });
        if (!user) {
          console.warn(`⚠️ User not found for clerkId: ${clerkUserId} — skipping membership removal`);
          break;
        }

        await fetchMutation(internalMembers.removeMember, {
          orgId: org._id,
          userId: user._id,
        });
        console.log(`✅ Membership removed: user=${clerkUserId} org=${clerkOrgId}`);
        break;
      }

      default:
        console.log(`⚠️ Unhandled Clerk event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing Clerk webhook:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

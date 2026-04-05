import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { fetchQuery } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stripeCustomerId: bodyCustomerId } = body as { stripeCustomerId?: string };

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Resolve stripeCustomerId: use provided value, or look up from Convex records
    let stripeCustomerId = bodyCustomerId;

    if (!stripeCustomerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalUsers = (internal as any).users;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalOrgs = (internal as any).organizations;

      if (orgId) {
        // Try org record first when user has an active org session
        try {
          const org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId: orgId });
          if (org?.stripeCustomerId) {
            stripeCustomerId = org.stripeCustomerId;
          }
        } catch {
          console.warn('[stripe/portal] Could not look up org stripeCustomerId');
        }
      }

      if (!stripeCustomerId) {
        // Fall back to user record
        try {
          const user = await fetchQuery(internalUsers.getByClerkId, { clerkId: userId });
          if (user?.stripeCustomerId) {
            stripeCustomerId = user.stripeCustomerId;
          }
        } catch {
          console.warn('[stripe/portal] Could not look up user stripeCustomerId');
        }
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found for this account' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/portal] Error creating portal session:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { fetchQuery } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convexAdminOpts = { adminToken: process.env.CONVEX_DEPLOY_KEY! } as any;

// Stripe Price IDs per tier and billing interval.
// Set via env vars so they can be configured per environment without code changes.
const PRICE_IDS: Record<string, Record<string, string>> = {
  active: {
    monthly: process.env.STRIPE_PRICE_ACTIVE_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_ACTIVE_ANNUAL ?? '',
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? '',
  },
};

export async function POST(request: NextRequest) {
  try {
    // Only userId is required — orgId is optional (user-level subscriptions are supported)
    const { userId, orgId: sessionOrgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized — must be signed in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tier, billingInterval, orgId: bodyOrgId } = body as {
      tier: string;
      billingInterval: 'monthly' | 'annual';
      orgId?: string;
    };

    // Use orgId from body if provided, otherwise fall back to Clerk session orgId
    const effectiveOrgId = bodyOrgId || sessionOrgId || null;

    if (!tier || !billingInterval) {
      return NextResponse.json({ error: 'tier and billingInterval are required' }, { status: 400 });
    }

    const priceId = PRICE_IDS[tier]?.[billingInterval];
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for tier "${tier}" / interval "${billingInterval}"` },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Reuse existing Stripe customer to prevent duplicates and enable billing portal.
    let stripeCustomerId: string | undefined;

    if (effectiveOrgId) {
      // Org-level subscription: look up stripeCustomerId on org record
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const org = await fetchQuery((internal as any).organizations.getByClerkOrgId, {
          clerkOrgId: effectiveOrgId,
        }, convexAdminOpts);
        if (org?.stripeCustomerId) {
          stripeCustomerId = org.stripeCustomerId;
        }
      } catch {
        console.warn('[stripe/subscribe] Could not look up org stripeCustomerId – proceeding without customer reuse');
      }
    } else {
      // User-level subscription: look up stripeCustomerId on user record
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = await fetchQuery((internal as any).users.getByClerkId, {
          clerkId: userId,
        }, convexAdminOpts);
        if (user?.stripeCustomerId) {
          stripeCustomerId = user.stripeCustomerId;
        }
      } catch {
        console.warn('[stripe/subscribe] Could not look up user stripeCustomerId – proceeding without customer reuse');
      }
    }

    // Always include clerkUserId; only include clerkOrgId when subscribing via org
    const metadata: Record<string, string> = {
      clerkUserId: userId,
      tier,
      billingInterval,
    };
    if (effectiveOrgId) {
      metadata.clerkOrgId = effectiveOrgId;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/settings/billing?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      // client_reference_id is orgId for org subscriptions, userId for user-level
      client_reference_id: effectiveOrgId ?? userId,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      metadata,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[stripe/subscribe] Error creating subscription session:', error);
    return NextResponse.json({ error: 'Failed to create subscription session' }, { status: 500 });
  }
}

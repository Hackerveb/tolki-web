import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { fetchQuery } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

// Stripe Price IDs per tier and billing interval.
// Set via env vars so they can be configured per environment without code changes.
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL ?? '',
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? '',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized — must be signed in with an active organization' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tier, billingInterval } = body as { tier: string; billingInterval: 'monthly' | 'annual' };

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

    // Reuse the existing Stripe customer if the org already has one.
    // This prevents duplicate customers in Stripe and enables the billing portal.
    let stripeCustomerId: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const org = await fetchQuery((internal as any).organizations.getByClerkOrgId, {
        clerkOrgId: orgId,
      });
      if (org?.stripeCustomerId) {
        stripeCustomerId = org.stripeCustomerId;
      }
    } catch {
      // Non-fatal: if Convex lookup fails we proceed without customer reuse
      console.warn('[stripe/subscribe] Could not look up org stripeCustomerId – proceeding without customer reuse');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/settings/billing?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      client_reference_id: orgId,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      metadata: {
        clerkOrgId: orgId,
        clerkUserId: userId,
        tier,
        billingInterval,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[stripe/subscribe] Error creating subscription session:', error);
    return NextResponse.json({ error: 'Failed to create subscription session' }, { status: 500 });
  }
}

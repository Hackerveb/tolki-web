import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { CREDIT_RATES_NOK_PER_MIN, MIN_CREDIT_PURCHASE_MINUTES, MAX_CREDIT_PURCHASE_MINUTES, getCreditRateForTier } from '@/lib/credit-packages';
import { fetchQuery } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { minutes, clerkId } = body as { minutes: number; clerkId: string };

    // Verify the authenticated user matches the requested user
    if (userId !== clerkId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate minutes parameter
    if (!minutes || typeof minutes !== 'number' || !Number.isInteger(minutes)) {
      return NextResponse.json({ error: 'minutes must be a positive integer' }, { status: 400 });
    }
    if (minutes < MIN_CREDIT_PURCHASE_MINUTES || minutes > MAX_CREDIT_PURCHASE_MINUTES) {
      return NextResponse.json(
        { error: `minutes must be between ${MIN_CREDIT_PURCHASE_MINUTES} and ${MAX_CREDIT_PURCHASE_MINUTES}` },
        { status: 400 }
      );
    }

    // Determine the user's subscription tier to apply the correct rate
    let tier: SubscriptionTier | 'none' = 'none';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalUsers = (internal as any).users;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internalSubs = (internal as any).subscriptions;

      const user = await fetchQuery(internalUsers.getByClerkId, { clerkId });
      if (user) {
        const sub = await fetchQuery(internalSubs.getActiveSubscriptionByUserInternal, {
          userId: user._id,
        });
        if (sub?.tier) {
          tier = sub.tier as SubscriptionTier;
        } else {
          // User exists but no paid subscription — free tier rate applies
          tier = 'free';
        }
      }
    } catch {
      console.warn('[stripe/checkout] Could not look up user tier – using default rate');
    }

    const rateNokPerMin = getCreditRateForTier(tier);
    const priceOre = Math.ceil(minutes * rateNokPerMin * 100); // øre (Stripe smallest unit for NOK)

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin')
      || process.env.NEXT_PUBLIC_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Create Stripe Checkout session (NOK currency)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: `${minutes} minutter tolketjeneste`,
              description: `${minutes} minutter tolketjeneste fra TolKI`,
            },
            unit_amount: priceOre,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/settings/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/credits?canceled=true`,
      client_reference_id: clerkId,
      metadata: {
        clerkId,
        minutes: minutes.toString(),
        rateNokPerMin: rateNokPerMin.toString(),
        tier,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: `Webhook Error: ${error}` },
      { status: 400 }
    );
  }

  console.log('Received webhook event:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('Processing checkout session:', session.id);

        // Extract metadata
        const clerkId = session.metadata?.clerkId || session.client_reference_id;
        const credits = parseInt(session.metadata?.credits || '0', 10);
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        if (!clerkId || !credits) {
          console.error('Missing required metadata in session:', session.id);
          return NextResponse.json(
            { error: 'Missing metadata' },
            { status: 400 }
          );
        }

        // Add credits to user account via Convex mutation
        try {
          await convex.mutation(api.payments.recordPurchase, {
            clerkId,
            credits,
            amount,
            stripeSessionId: session.id,
            status: 'completed',
          });

          console.log(`Successfully added ${credits} credits to user ${clerkId}`);
        } catch (convexError) {
          console.error('Error adding credits to Convex:', convexError);
          return NextResponse.json(
            { error: 'Failed to add credits' },
            { status: 500 }
          );
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session expired:', session.id);

        // Optionally record failed purchase
        const clerkId = session.metadata?.clerkId || session.client_reference_id;
        if (clerkId) {
          await convex.mutation(api.payments.recordPurchase, {
            clerkId,
            credits: 0,
            amount: 0,
            stripeSessionId: session.id,
            status: 'failed',
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

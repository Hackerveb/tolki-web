import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  console.log('✅ Webhook secret configured, signature present');

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Webhook signature verification failed:', error);
    console.error('Webhook secret (first 10 chars):', webhookSecret.substring(0, 10));
    return NextResponse.json(
      { error: `Webhook Error: ${error}` },
      { status: 400 }
    );
  }

  console.log('📨 Received webhook event:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('💳 Processing checkout session:', session.id);
        console.log('Payment status:', session.payment_status);
        console.log('Amount total:', session.amount_total);

        // Extract metadata
        const clerkId = session.metadata?.clerkId || session.client_reference_id;
        const credits = parseInt(session.metadata?.credits || '0', 10);
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        console.log('📋 Metadata extracted:', {
          clerkId,
          credits,
          amount,
          packageId: session.metadata?.packageId,
        });

        if (!clerkId || !credits) {
          console.error('❌ Missing required metadata in session:', session.id);
          console.error('Session metadata:', session.metadata);
          console.error('Client reference ID:', session.client_reference_id);
          return NextResponse.json(
            { error: 'Missing metadata' },
            { status: 400 }
          );
        }

        // Add credits to user account via Convex mutation
        try {
          console.log(`🔄 Calling Convex mutation to add ${credits} credits to user ${clerkId}`);

          const result = await convex.mutation(api.payments.recordPurchase, {
            clerkId,
            credits,
            amount,
            stripeSessionId: session.id,
            status: 'completed',
          });

          if ('duplicate' in result && result.duplicate) {
            console.log('⚠️ Duplicate webhook detected - purchase already processed');
            console.log(`ℹ️ No credits added (already added previously). Current balance: ${result.newBalance}`);
          } else {
            console.log('✅ Successfully added credits. Result:', result);
            console.log(`🎉 ${result.creditsAdded} credits added to user ${clerkId}. New balance: ${result.newBalance}`);
          }
        } catch (convexError) {
          console.error('❌ Error adding credits to Convex:', convexError);
          console.error('Error details:', convexError instanceof Error ? convexError.message : convexError);
          return NextResponse.json(
            { error: 'Failed to add credits' },
            { status: 500 }
          );
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('⏰ Checkout session expired:', session.id);

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
          console.log('📝 Recorded expired session for user:', clerkId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);
        console.log('Failure reason:', paymentIntent.last_payment_error?.message);
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { getTierForPriceId } from '@/lib/subscription-tiers';
import Stripe from 'stripe';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { internal } from '@/convex/_generated/api';

// ─── Internal function references ────────────────────────────────────────────
// The generated API types only include modules deployed before TOL-119.
// These references resolve correctly at runtime via the Convex deploy key.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalOrgs = (internal as any).organizations;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalSubs = (internal as any).subscriptions;

export async function POST(request: NextRequest) {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Webhook signature verification failed:', error);
    return NextResponse.json({ error: `Webhook Error: ${error}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Checkout completed (one-time payments AND subscription checkouts) ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 checkout.session.completed:', session.id, 'mode:', session.mode);

        if (session.mode === 'subscription') {
          await handleSubscriptionCheckoutCompleted(session);
        } else {
          await handleCreditCheckoutCompleted(session);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('⏰ Checkout session expired:', session.id);
        if (session.mode !== 'subscription') {
          const clerkId = session.metadata?.clerkId || session.client_reference_id;
          if (clerkId) {
            // @ts-expect-error internal reference not in generated types
            await fetchMutation(internal.payments.recordPurchase, {
              clerkId,
              credits: 0,
              amount: 0,
              stripeSessionId: session.id,
              status: 'failed',
            });
            console.log('📝 Recorded expired session for user:', clerkId);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', pi.id, pi.last_payment_error?.message);
        break;
      }

      // ── Subscription lifecycle ───────────────────────────────────────────
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        console.log('🆕 customer.subscription.created:', sub.id);
        await handleSubscriptionCreated(sub);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        console.log('🔄 customer.subscription.updated:', sub.id, 'status:', sub.status);
        await handleSubscriptionUpdated(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        console.log('🗑️ customer.subscription.deleted:', sub.id);
        await fetchMutation(internalSubs.cancelSubscription, {
          stripeSubscriptionId: sub.id,
        });
        console.log('✅ Subscription marked canceled in Convex');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('✅ invoice.payment_succeeded:', invoice.id, 'reason:', invoice.billing_reason);
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ invoice.payment_failed:', invoice.id);
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// ─── Handler: one-time credit checkout ───────────────────────────────────────
async function handleCreditCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkId = session.metadata?.clerkId || session.client_reference_id;
  const credits = parseInt(session.metadata?.credits || '0', 10);
  const amount = session.amount_total ? session.amount_total / 100 : 0;

  if (!clerkId || !credits) {
    console.error('❌ Missing required metadata in credit checkout session:', session.id);
    throw new Error('Missing metadata in credit checkout session');
  }

  // @ts-expect-error internal reference not in generated types
  const result = await fetchMutation(internal.payments.recordPurchase, {
    clerkId,
    credits,
    amount,
    stripeSessionId: session.id,
    status: 'completed',
  });

  if ('duplicate' in result && result.duplicate) {
    console.log('⚠️ Duplicate credit webhook – already processed. Balance:', result.newBalance);
  } else {
    console.log(`🎉 ${result.creditsAdded} credits added to ${clerkId}. Balance: ${result.newBalance}`);
  }
}

// ─── Handler: subscription checkout completed ─────────────────────────────────
// Saves the Stripe customer ID on the org for future customer reuse.
// Minute provisioning happens in customer.subscription.created.
async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkOrgId = session.metadata?.clerkOrgId || (session.client_reference_id ?? '');
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!clerkOrgId) {
    console.error('❌ Missing clerkOrgId in subscription checkout session:', session.id);
    return;
  }

  const org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
  if (!org) {
    console.error('❌ Org not found for clerkOrgId:', clerkOrgId);
    return;
  }

  if (stripeCustomerId && !org.stripeCustomerId) {
    await fetchMutation(internalOrgs.updateStripeCustomerId, {
      orgId: org._id,
      stripeCustomerId,
    });
    console.log(`✅ Saved stripeCustomerId ${stripeCustomerId} for org ${clerkOrgId}`);
  }
}

// ─── Handler: customer.subscription.created ───────────────────────────────────
async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const clerkOrgId = sub.metadata?.clerkOrgId;
  if (!clerkOrgId) {
    console.error('❌ customer.subscription.created missing clerkOrgId metadata, sub:', sub.id);
    return;
  }

  const org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
  if (!org) {
    console.error('❌ Org not found for clerkOrgId:', clerkOrgId, 'sub:', sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id ?? '';
  const tierMeta = getTierForPriceId(priceId);
  if (!tierMeta) {
    console.error('❌ Unknown price ID in subscription:', priceId, 'sub:', sub.id);
    return;
  }

  const status = mapStripeSubStatus(sub.status);
  await fetchMutation(internalSubs.createSubscription, {
    orgId: org._id,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    tier: tierMeta.tier,
    status,
    includedMinutes: tierMeta.includedMinutes,
    overageRateNok: tierMeta.overageRateNok,
    billingInterval: tierMeta.billingInterval,
    currentPeriodStart: sub.current_period_start * 1000,
    currentPeriodEnd: sub.current_period_end * 1000,
  });

  console.log(
    `✅ Subscription created in Convex: org=${clerkOrgId} tier=${tierMeta.tier} minutes=${tierMeta.includedMinutes}`
  );
}

// ─── Handler: customer.subscription.updated ───────────────────────────────────
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price?.id ?? '';
  const tierMeta = getTierForPriceId(priceId);
  const status = mapStripeSubStatus(sub.status);

  const patch: Record<string, unknown> = {
    stripeSubscriptionId: sub.id,
    status,
    currentPeriodStart: sub.current_period_start * 1000,
    currentPeriodEnd: sub.current_period_end * 1000,
  };

  if (tierMeta) {
    patch.stripePriceId = priceId;
    patch.tier = tierMeta.tier;
    patch.includedMinutes = tierMeta.includedMinutes;
    patch.overageRateNok = tierMeta.overageRateNok;
    patch.billingInterval = tierMeta.billingInterval;
  }

  await fetchMutation(internalSubs.updateSubscription, patch);
  console.log(`✅ Subscription updated in Convex: ${sub.id} status=${status}`);
}

// ─── Handler: invoice.payment_succeeded ──────────────────────────────────────
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only process renewal cycles; new subscriptions are handled via subscription.created
  if (invoice.billing_reason !== 'subscription_cycle') {
    console.log(
      'ℹ️ Skipping invoice.payment_succeeded – not a renewal (reason:',
      invoice.billing_reason,
      ')'
    );
    return;
  }

  const stripeSubId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubId) {
    console.error('❌ invoice.payment_succeeded missing subscription ID');
    return;
  }

  // Retrieve the live Stripe subscription for updated period boundaries
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
  const priceId = stripeSub.items.data[0]?.price?.id ?? '';
  const tierMeta = getTierForPriceId(priceId);
  if (!tierMeta) {
    console.error('❌ Unknown price ID on renewal subscription:', priceId);
    return;
  }

  const convexSub = await fetchQuery(internalSubs.getByStripeSubscriptionId, {
    stripeSubscriptionId: stripeSubId,
  });
  if (!convexSub) {
    console.error('❌ Convex subscription not found for stripe sub:', stripeSubId);
    return;
  }

  const newPeriodStart = stripeSub.current_period_start * 1000;
  const newPeriodEnd = stripeSub.current_period_end * 1000;

  // Roll over unused minutes (capped at one cycle's worth) and reset usage counter
  await fetchMutation(internalOrgs.processRollover, {
    orgId: convexSub.orgId,
    newIncludedMinutes: tierMeta.includedMinutes,
    newBillingCycleStart: newPeriodStart,
    newBillingCycleEnd: newPeriodEnd,
  });

  // Sync subscription period boundaries
  await fetchMutation(internalSubs.updateSubscription, {
    stripeSubscriptionId: stripeSubId,
    status: 'active',
    currentPeriodStart: newPeriodStart,
    currentPeriodEnd: newPeriodEnd,
  });

  console.log(
    `✅ Renewal processed for ${stripeSubId}: ${tierMeta.includedMinutes} minutes provisioned`
  );
}

// ─── Handler: invoice.payment_failed ─────────────────────────────────────────
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubId) {
    console.error('❌ invoice.payment_failed missing subscription ID');
    return;
  }

  await fetchMutation(internalSubs.updateSubscription, {
    stripeSubscriptionId: stripeSubId,
    status: 'past_due',
  });

  console.log(`⚠️ Subscription marked past_due: ${stripeSubId}`);
  // TODO (TOL-124): notify org admin via email when invoice payment fails
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function mapStripeSubStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'trialing':
      return 'trialing';
    default:
      return 'active';
  }
}

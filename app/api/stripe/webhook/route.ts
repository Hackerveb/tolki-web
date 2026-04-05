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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalUsers = (internal as any).users;

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
        await handleSubscriptionDeleted(sub);
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
  // Support both new `minutes` metadata and legacy `credits` metadata
  const minutes = parseInt(session.metadata?.minutes || session.metadata?.credits || '0', 10);
  const amount = session.amount_total ? session.amount_total / 100 : 0;

  if (!clerkId || !minutes) {
    console.error('❌ Missing required metadata in credit checkout session:', session.id);
    throw new Error('Missing metadata in credit checkout session');
  }

  // @ts-expect-error internal reference not in generated types
  const result = await fetchMutation(internal.payments.recordPurchase, {
    clerkId,
    credits: minutes,
    amount,
    stripeSessionId: session.id,
    status: 'completed',
  });

  if ('duplicate' in result && result.duplicate) {
    console.log('⚠️ Duplicate credit webhook – already processed. Balance:', result.newBalance);
  } else {
    console.log(`🎉 ${result.creditsAdded} minutes added to ${clerkId}. Balance: ${result.newBalance}`);
  }
}

// ─── Handler: subscription checkout completed ─────────────────────────────────
// Saves the Stripe customer ID on the org or user record for future customer reuse.
// Minute provisioning happens in customer.subscription.created.
async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkOrgId = session.metadata?.clerkOrgId;
  const clerkUserId = session.metadata?.clerkUserId || session.client_reference_id;
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (clerkOrgId) {
    // Org-level subscription — save customer ID on org
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
  } else if (clerkUserId) {
    // User-level subscription — save customer ID on user
    const user = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId });
    if (!user) {
      console.error('❌ User not found for clerkUserId:', clerkUserId);
      return;
    }
    if (stripeCustomerId && !user.stripeCustomerId) {
      await fetchMutation(internalUsers.updateStripeCustomerId, {
        userId: user._id,
        stripeCustomerId,
      });
      console.log(`✅ Saved stripeCustomerId ${stripeCustomerId} for user ${clerkUserId}`);
    }
  } else {
    console.error('❌ Missing clerkOrgId and clerkUserId in subscription checkout session:', session.id);
  }
}

// Helper: extract billing period from Stripe subscription.
// In Stripe SDK v19+ (API 2025-10-29), current_period_start/end were removed from
// the Subscription type but still exist at runtime. Fall back to items if needed.
function getSubscriptionPeriod(sub: Stripe.Subscription): { start: number; end: number } {
  const raw = sub as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (raw.current_period_start && raw.current_period_end) {
    return { start: raw.current_period_start, end: raw.current_period_end };
  }
  const item = sub.items?.data?.[0] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (item?.current_period_start && item?.current_period_end) {
    return { start: item.current_period_start, end: item.current_period_end };
  }
  // Last resort: use created timestamp and estimate 30 days
  return { start: sub.created, end: sub.created + 30 * 24 * 60 * 60 };
}

// ─── Handler: customer.subscription.created ───────────────────────────────────
async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const clerkOrgId = sub.metadata?.clerkOrgId;
  const clerkUserId = sub.metadata?.clerkUserId;

  const priceId = sub.items.data[0]?.price?.id ?? '';
  const tierMeta = getTierForPriceId(priceId);
  if (!tierMeta) {
    console.error('❌ Unknown price ID in subscription:', priceId, 'sub:', sub.id);
    return;
  }

  const status = mapStripeSubStatus(sub.status);
  const period = getSubscriptionPeriod(sub);

  if (clerkOrgId) {
    // Org-level subscription
    const org = await fetchQuery(internalOrgs.getByClerkOrgId, { clerkOrgId });
    if (!org) {
      console.error('❌ Org not found for clerkOrgId:', clerkOrgId, 'sub:', sub.id);
      return;
    }
    await fetchMutation(internalSubs.createSubscription, {
      orgId: org._id,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      tier: tierMeta.tier,
      status,
      includedMinutes: tierMeta.includedMinutes,
      overageRateNok: tierMeta.overageRateNok,
      billingInterval: tierMeta.billingInterval,
      currentPeriodStart: period.start * 1000,
      currentPeriodEnd: period.end * 1000,
    });
    console.log(
      `✅ Org subscription created in Convex: org=${clerkOrgId} tier=${tierMeta.tier} minutes=${tierMeta.includedMinutes}`
    );
  } else if (clerkUserId) {
    // User-level subscription
    const user = await fetchQuery(internalUsers.getByClerkId, { clerkId: clerkUserId });
    if (!user) {
      console.error('❌ User not found for clerkUserId:', clerkUserId, 'sub:', sub.id);
      return;
    }
    await fetchMutation(internalSubs.createSubscription, {
      userId: user._id,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      tier: tierMeta.tier,
      status,
      includedMinutes: tierMeta.includedMinutes,
      overageRateNok: tierMeta.overageRateNok,
      billingInterval: tierMeta.billingInterval,
      currentPeriodStart: period.start * 1000,
      currentPeriodEnd: period.end * 1000,
    });
    console.log(
      `✅ User subscription created in Convex: user=${clerkUserId} tier=${tierMeta.tier} minutes=${tierMeta.includedMinutes}`
    );
  } else {
    console.error('❌ customer.subscription.created missing clerkOrgId and clerkUserId metadata, sub:', sub.id);
  }
}

// ─── Handler: customer.subscription.updated ───────────────────────────────────
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price?.id ?? '';
  const tierMeta = getTierForPriceId(priceId);
  const status = mapStripeSubStatus(sub.status);

  // Detect plan downgrade: fetch current subscription record to compare includedMinutes.
  // Per pricing rules, rollover resets on downgrade to prevent gaming.
  if (tierMeta) {
    const convexSub = await fetchQuery(internalSubs.getByStripeSubscriptionId, {
      stripeSubscriptionId: sub.id,
    });
    if (convexSub && tierMeta.includedMinutes < convexSub.includedMinutes) {
      console.log(
        `⬇️ Plan downgrade detected for ${sub.id}: ${convexSub.includedMinutes} → ${tierMeta.includedMinutes} min — resetting rollover`
      );
      if (convexSub.orgId) {
        await fetchMutation(internalOrgs.resetRolloverOnDowngrade, { orgId: convexSub.orgId });
      } else if (convexSub.userId) {
        await fetchMutation(internalSubs.resetUserRolloverOnDowngrade, { userId: convexSub.userId });
      }
    }
  }

  const period = getSubscriptionPeriod(sub);
  const patch: Record<string, unknown> = {
    stripeSubscriptionId: sub.id,
    status,
    currentPeriodStart: period.start * 1000,
    currentPeriodEnd: period.end * 1000,
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

// Helper: extract subscription ID from invoice (Stripe v19 type compat)
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const raw = invoice as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (typeof raw.subscription === 'string') return raw.subscription;
  if (raw.subscription?.id) return raw.subscription.id;
  return undefined;
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

  const stripeSubId = getInvoiceSubscriptionId(invoice);
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

  const renewalPeriod = getSubscriptionPeriod(stripeSub);
  const newPeriodStart = renewalPeriod.start * 1000;
  const newPeriodEnd = renewalPeriod.end * 1000;

  if (convexSub.orgId) {
    // ── Org-level renewal ─────────────────────────────────────────────────

    // Report overage from closing cycle to Stripe
    const org = await fetchQuery(internalOrgs.getById, { orgId: convexSub.orgId });
    const overageMinutes = org?.overageMinutesThisCycle ?? 0;

    if (overageMinutes > 0 && org?.stripeCustomerId) {
      const overageRateNok = convexSub.overageRateNok;
      const overageAmountOre = Math.ceil(overageMinutes * overageRateNok * 100);
      const overageDescription =
        `Overage: ${Math.ceil(overageMinutes)} min × ${overageRateNok} NOK/min (${tierMeta.tier} plan)`;
      try {
        await stripe.invoiceItems.create({
          customer: org.stripeCustomerId,
          amount: overageAmountOre,
          currency: 'nok',
          description: overageDescription,
        });
        console.log(
          `📊 Overage invoice item created: ${Math.ceil(overageMinutes)} min × ${overageRateNok} NOK = ${overageAmountOre / 100} NOK for ${org.stripeCustomerId}`
        );
      } catch (err) {
        console.error('❌ Failed to create overage invoice item — proceeding with rollover anyway:', err);
      }
    } else if (overageMinutes > 0) {
      console.warn(`⚠️ Org ${convexSub.orgId} has ${overageMinutes} overage minutes but no stripeCustomerId — skipping Stripe report`);
    }

    // Roll over unused minutes and reset cycle counters
    await fetchMutation(internalOrgs.processRollover, {
      orgId: convexSub.orgId,
      newIncludedMinutes: tierMeta.includedMinutes,
      newBillingCycleStart: newPeriodStart,
      newBillingCycleEnd: newPeriodEnd,
    });

    // Reset per-member usage counters for the new cycle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalMemberships = (internal as any).memberships;
    await fetchMutation(internalMemberships.resetMemberMinutes, { orgId: convexSub.orgId });

  } else if (convexSub.userId) {
    // ── User-level renewal ────────────────────────────────────────────────

    // Report overage from closing cycle to Stripe
    const user = await fetchQuery(internalUsers.getById, { userId: convexSub.userId });
    const overageMinutes = user?.overageMinutesThisCycle ?? 0;

    if (overageMinutes > 0 && user?.stripeCustomerId) {
      const overageRateNok = convexSub.overageRateNok;
      const overageAmountOre = Math.ceil(overageMinutes * overageRateNok * 100);
      const overageDescription =
        `Overage: ${Math.ceil(overageMinutes)} min × ${overageRateNok} NOK/min (${tierMeta.tier} plan)`;
      try {
        await stripe.invoiceItems.create({
          customer: user.stripeCustomerId,
          amount: overageAmountOre,
          currency: 'nok',
          description: overageDescription,
        });
        console.log(
          `📊 User overage invoice item created: ${Math.ceil(overageMinutes)} min × ${overageRateNok} NOK = ${overageAmountOre / 100} NOK for ${user.stripeCustomerId}`
        );
      } catch (err) {
        console.error('❌ Failed to create user overage invoice item — proceeding with rollover anyway:', err);
      }
    } else if (overageMinutes > 0) {
      console.warn(`⚠️ User ${convexSub.userId} has ${overageMinutes} overage minutes but no stripeCustomerId — skipping Stripe report`);
    }

    // Roll over unused minutes and reset cycle for user
    await fetchMutation(internalSubs.processUserRollover, {
      userId: convexSub.userId,
      newIncludedMinutes: tierMeta.includedMinutes,
      newCycleStart: newPeriodStart,
      newCycleEnd: newPeriodEnd,
    });
  }

  // Sync subscription period boundaries
  await fetchMutation(internalSubs.updateSubscription, {
    stripeSubscriptionId: stripeSubId,
    status: 'active',
    currentPeriodStart: newPeriodStart,
    currentPeriodEnd: newPeriodEnd,
  });

  console.log(
    `✅ Renewal processed for ${stripeSubId}: ${tierMeta.includedMinutes} min provisioned`
  );
}

// ─── Handler: customer.subscription.deleted ──────────────────────────────────
// Marks subscription canceled; user-level rollover reset is handled inside cancelSubscription mutation.
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  // cancelSubscription handles user-level rollover reset internally
  await fetchMutation(internalSubs.cancelSubscription, {
    stripeSubscriptionId: sub.id,
  });
  console.log('✅ Subscription marked canceled in Convex:', sub.id);

  // For org-level subscriptions, also reset org rollover balance
  const convexSub = await fetchQuery(internalSubs.getByStripeSubscriptionId, {
    stripeSubscriptionId: sub.id,
  });
  if (convexSub?.orgId) {
    await fetchMutation(internalOrgs.resetRolloverOnCancellation, { orgId: convexSub.orgId });
    console.log('✅ Rollover balance reset for org:', convexSub.orgId);
  }
}

// ─── Handler: invoice.payment_failed ─────────────────────────────────────────
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubId) {
    console.error('❌ invoice.payment_failed missing subscription ID');
    return;
  }

  await fetchMutation(internalSubs.updateSubscription, {
    stripeSubscriptionId: stripeSubId,
    status: 'past_due',
  });

  console.log(`⚠️ Subscription marked past_due: ${stripeSubId}`);
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

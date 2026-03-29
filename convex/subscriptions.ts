import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";

// Helper: verify caller is authenticated
async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

// ─── Internal mutations (called from Stripe webhooks) ───────────────────────

// Create subscription record on customer.subscription.created
export const createSubscription = internalMutation({
  args: {
    orgId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    tier: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("business"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("trialing")
    ),
    includedMinutes: v.number(),
    overageRateNok: v.number(),
    billingInterval: v.union(v.literal("monthly"), v.literal("annual")),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Idempotency check
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (existing) return existing._id;

    const subId = await ctx.db.insert("subscriptions", {
      ...args,
      createdAt: Date.now(),
    });

    // Provision initial minute balance on the org
    await ctx.db.patch(args.orgId, {
      totalMinutesAvailable: args.includedMinutes,
      minutesUsedThisCycle: 0,
      currentBillingCycleStart: args.currentPeriodStart,
      currentBillingCycleEnd: args.currentPeriodEnd,
    });

    return subId;
  },
});

// Update subscription on customer.subscription.updated (plan changes, renewals)
export const updateSubscription = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripePriceId: v.optional(v.string()),
    tier: v.optional(
      v.union(
        v.literal("starter"),
        v.literal("professional"),
        v.literal("business"),
        v.literal("enterprise")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled"),
        v.literal("trialing")
      )
    ),
    includedMinutes: v.optional(v.number()),
    overageRateNok: v.optional(v.number()),
    billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { stripeSubscriptionId, ...fields } = args;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .first();

    if (!sub) throw new Error(`Subscription not found: ${stripeSubscriptionId}`);

    // Strip undefined values before patching
    const patch: Record<string, any> = {};
    if (fields.stripePriceId !== undefined) patch.stripePriceId = fields.stripePriceId;
    if (fields.tier !== undefined) patch.tier = fields.tier;
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.includedMinutes !== undefined) patch.includedMinutes = fields.includedMinutes;
    if (fields.overageRateNok !== undefined) patch.overageRateNok = fields.overageRateNok;
    if (fields.billingInterval !== undefined) patch.billingInterval = fields.billingInterval;
    if (fields.currentPeriodStart !== undefined) patch.currentPeriodStart = fields.currentPeriodStart;
    if (fields.currentPeriodEnd !== undefined) patch.currentPeriodEnd = fields.currentPeriodEnd;

    await ctx.db.patch(sub._id, patch);

    return sub._id;
  },
});

// Cancel subscription on customer.subscription.deleted
export const cancelSubscription = internalMutation({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!sub) return; // Already gone, nothing to do

    await ctx.db.patch(sub._id, { status: "canceled" });
  },
});

// ─── Client-callable queries ─────────────────────────────────────────────────

// Get org subscription by Clerk org ID (used by frontend components)
export const getSubscriptionByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) return null;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .collect();

    const activeSub =
      subscriptions
        .filter((s) => s.status !== "canceled")
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

    return activeSub
      ? {
          ...activeSub,
          org: {
            name: org.name,
            slug: org.slug,
            creditPoolMode: org.creditPoolMode,
            totalMinutesAvailable: org.totalMinutesAvailable,
            minutesUsedThisCycle: org.minutesUsedThisCycle,
            rolloverMinutes: org.rolloverMinutes,
            currentBillingCycleStart: org.currentBillingCycleStart,
            currentBillingCycleEnd: org.currentBillingCycleEnd,
          },
        }
      : null;
  },
});

// Get the active subscription for an org
export const getActiveSubscription = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Return the most recent non-canceled subscription
    return (
      subscriptions
        .filter((s) => s.status !== "canceled")
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
    );
  },
});

// ─── Internal queries ────────────────────────────────────────────────────────

// Get active subscription by org (for webhook handlers and usage checks)
export const getActiveSubscriptionInternal = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return (
      subscriptions
        .filter((s) => s.status !== "canceled")
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
    );
  },
});

// Get subscription by Stripe subscription ID (for webhook handlers)
export const getByStripeSubscriptionId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first(),
});

import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth, requireOrgMember, getUserByClerkId } from "./lib/auth";

// Shared tier validator
const tierValidator = v.union(
  v.literal("free"),
  v.literal("active"),
  v.literal("enterprise")
);

// ─── Internal mutations (called from Stripe webhooks) ───────────────────────

// Create subscription record on customer.subscription.created
export const createSubscription = internalMutation({
  args: {
    orgId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    tier: tierValidator,
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
    if (!args.orgId && !args.userId) {
      throw new Error("createSubscription requires either orgId or userId");
    }

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

    // Provision initial minute balance on the org or user
    if (args.orgId) {
      await ctx.db.patch(args.orgId, {
        totalMinutesAvailable: args.includedMinutes,
        minutesUsedThisCycle: 0,
        currentBillingCycleStart: args.currentPeriodStart,
        currentBillingCycleEnd: args.currentPeriodEnd,
      });
    } else if (args.userId) {
      await provisionUserMinutesImpl(ctx, {
        userId: args.userId,
        minutes: args.includedMinutes,
        cycleStart: args.currentPeriodStart,
        cycleEnd: args.currentPeriodEnd,
      });
    }

    return subId;
  },
});

// Update subscription on customer.subscription.updated (plan changes, renewals)
export const updateSubscription = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripePriceId: v.optional(v.string()),
    tier: v.optional(tierValidator),
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

    // Idempotency guard: skip if period boundaries haven't changed and status matches.
    if (
      fields.currentPeriodStart !== undefined &&
      fields.currentPeriodEnd !== undefined &&
      sub.currentPeriodStart === fields.currentPeriodStart &&
      sub.currentPeriodEnd === fields.currentPeriodEnd &&
      (fields.status === undefined || sub.status === fields.status) &&
      (fields.tier === undefined || sub.tier === fields.tier)
    ) {
      return sub._id; // Already up to date — no-op
    }

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

    // Reset user-level minute tracking on cancellation
    if (sub.userId) {
      await resetUserRolloverOnCancellationImpl(ctx, { userId: sub.userId });
    }
  },
});

// ─── User minute management (internal mutations) ─────────────────────────────

async function provisionUserMinutesImpl(
  ctx: any,
  args: { userId: any; minutes: number; cycleStart: number; cycleEnd: number }
) {
  await ctx.db.patch(args.userId, {
    totalMinutesAvailable: args.minutes,
    minutesUsedThisCycle: 0,
    rolloverMinutes: 0,
    currentBillingCycleStart: args.cycleStart,
    currentBillingCycleEnd: args.cycleEnd,
  });
}

export const provisionUserMinutes = internalMutation({
  args: {
    userId: v.id("users"),
    minutes: v.number(),
    cycleStart: v.number(),
    cycleEnd: v.number(),
  },
  handler: async (ctx, args) => provisionUserMinutesImpl(ctx, args),
});

export const processUserRollover = internalMutation({
  args: {
    userId: v.id("users"),
    newIncludedMinutes: v.number(),
    newCycleStart: v.number(),
    newCycleEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error(`User not found: ${args.userId}`);

    const unusedMinutes = Math.max(
      0,
      (user.totalMinutesAvailable ?? 0) - (user.minutesUsedThisCycle ?? 0)
    );
    // Cap rollover at one cycle's worth of minutes (matches org rollover behavior)
    const rawRollover = (user.rolloverMinutes ?? 0) + unusedMinutes;
    const rollover = Math.min(rawRollover, args.newIncludedMinutes);

    await ctx.db.patch(args.userId, {
      totalMinutesAvailable: args.newIncludedMinutes + rollover,
      minutesUsedThisCycle: 0,
      rolloverMinutes: rollover,
      overageMinutesThisCycle: undefined,
      currentBillingCycleStart: args.newCycleStart,
      currentBillingCycleEnd: args.newCycleEnd,
    });
  },
});

export const resetUserRolloverOnDowngrade = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { rolloverMinutes: 0 });
  },
});

async function resetUserRolloverOnCancellationImpl(ctx: any, args: { userId: any }) {
  await ctx.db.patch(args.userId, {
    rolloverMinutes: 0,
    totalMinutesAvailable: 20, // Reset to free tier default
    minutesUsedThisCycle: 0,
    overageMinutesThisCycle: undefined,
    currentBillingCycleStart: undefined,
    currentBillingCycleEnd: undefined,
  });
}

export const resetUserRolloverOnCancellation = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => resetUserRolloverOnCancellationImpl(ctx, args),
});

// ─── Client-callable queries ─────────────────────────────────────────────────

// Get active subscription by Clerk user ID (user-level subscriptions)
// Caller must be the same user (no reading other users' subscriptions).
export const getSubscriptionByUserId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    if (identity.subject !== args.clerkId) {
      throw new Error("Forbidden: cannot read another user's subscription");
    }

    const user = await getUserByClerkId(ctx, args.clerkId);

    if (!user) return null;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeSub =
      subscriptions
        .filter((s) => s.status !== "canceled")
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

    return activeSub
      ? {
          ...activeSub,
          user: {
            stripeCustomerId: user.stripeCustomerId,
            totalMinutesAvailable: user.totalMinutesAvailable ?? 0,
            minutesUsedThisCycle: user.minutesUsedThisCycle ?? 0,
            rolloverMinutes: user.rolloverMinutes ?? 0,
            currentBillingCycleStart: user.currentBillingCycleStart,
            currentBillingCycleEnd: user.currentBillingCycleEnd,
          },
        }
      : null;
  },
});

// Get org subscription by Clerk org ID (caller must be a member)
export const getSubscriptionByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) return null;

    await requireOrgMember(ctx, org._id);

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
            stripeCustomerId: org.stripeCustomerId,
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

// Get the active subscription for an org (caller must be a member)
export const getActiveSubscription = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId);

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

// Get active subscription by user (for webhook handlers and usage checks)
export const getActiveSubscriptionByUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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

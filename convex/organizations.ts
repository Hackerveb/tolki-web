import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth, getUserByClerkId, requireOrgAdminOrOwner, requireOrgMember } from "./lib/auth";

// ─── Internal mutations (called from Clerk webhooks) ────────────────────────

// Create org when Clerk fires organization.created
export const createOrganization = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotency: skip if already exists
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) return existing._id;

    return ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      creditPoolMode: "shared",
      totalMinutesAvailable: 0,
      minutesUsedThisCycle: 0,
      rolloverMinutes: 0,
      createdAt: Date.now(),
    });
  },
});

// Upsert org from Clerk webhook (organization.created / organization.updated)
export const syncOrganization = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!existing) {
      return ctx.db.insert("organizations", {
        clerkOrgId: args.clerkOrgId,
        name: args.name,
        slug: args.slug,
        creditPoolMode: "shared",
        totalMinutesAvailable: 0,
        minutesUsedThisCycle: 0,
        rolloverMinutes: 0,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(existing._id, { name: args.name, slug: args.slug });
    return existing._id;
  },
});

// Soft-delete an org when Clerk fires organization.deleted
export const archiveOrganization = internalMutation({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!org) return; // already gone or never synced

    await ctx.db.patch(org._id, { deletedAt: Date.now() });
  },
});

// Called from Stripe webhook on invoice.payment_succeeded (cycle renewal)
export const updateOrgMinuteBalance = internalMutation({
  args: {
    orgId: v.id("organizations"),
    totalMinutesAvailable: v.number(),
    minutesUsedThisCycle: v.number(),
    rolloverMinutes: v.optional(v.number()),
    currentBillingCycleStart: v.optional(v.number()),
    currentBillingCycleEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId, ...fields } = args;
    await ctx.db.patch(orgId, {
      totalMinutesAvailable: fields.totalMinutesAvailable,
      minutesUsedThisCycle: fields.minutesUsedThisCycle,
      ...(fields.rolloverMinutes !== undefined && { rolloverMinutes: fields.rolloverMinutes }),
      ...(fields.currentBillingCycleStart !== undefined && { currentBillingCycleStart: fields.currentBillingCycleStart }),
      ...(fields.currentBillingCycleEnd !== undefined && { currentBillingCycleEnd: fields.currentBillingCycleEnd }),
    });
  },
});

// Deduct minutes from org pool (called during active sessions).
// When pool reaches 0 the session continues in overage mode; excess is tracked
// in overageMinutesThisCycle and reported to Stripe at cycle renewal.
export const deductOrgMinutes = internalMutation({
  args: {
    orgId: v.id("organizations"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    const newUsed = org.minutesUsedThisCycle + args.minutes;
    const currentAvailable = org.totalMinutesAvailable;

    let newAvailable: number;
    let overageDelta = 0;

    if (currentAvailable >= args.minutes) {
      // Pool has enough — normal deduction
      newAvailable = currentAvailable - args.minutes;
    } else {
      // Transitioning into (or continuing) overage
      overageDelta = args.minutes - Math.max(0, currentAvailable);
      newAvailable = 0;
    }

    const currentOverage = org.overageMinutesThisCycle ?? 0;
    const patch: Record<string, number> = {
      minutesUsedThisCycle: Math.round(newUsed * 1000) / 1000,
      totalMinutesAvailable: Math.round(newAvailable * 1000) / 1000,
    };
    if (overageDelta > 0) {
      patch.overageMinutesThisCycle = Math.round((currentOverage + overageDelta) * 1000) / 1000;
    }

    await ctx.db.patch(args.orgId, patch);

    return {
      minutesUsedThisCycle: newUsed,
      totalMinutesAvailable: newAvailable,
      inOverage: newAvailable === 0,
    };
  },
});

// Process minute rollover at the start of a new billing cycle.
// Overage for the closing cycle must be reported to Stripe BEFORE calling this.
export const processRollover = internalMutation({
  args: {
    orgId: v.id("organizations"),
    newIncludedMinutes: v.number(),
    newBillingCycleStart: v.number(),
    newBillingCycleEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    // Unused minutes from the previous cycle carry over (capped at one cycle's worth).
    // If the org was in overage, totalMinutesAvailable is 0, so unusedMinutes = 0.
    const unusedMinutes = Math.max(0, org.totalMinutesAvailable);
    const rolloverMinutes = Math.min(unusedMinutes, args.newIncludedMinutes);

    await ctx.db.patch(args.orgId, {
      rolloverMinutes,
      totalMinutesAvailable: args.newIncludedMinutes + rolloverMinutes,
      minutesUsedThisCycle: 0,
      overageMinutesThisCycle: 0, // Reset after Stripe reporting
      currentBillingCycleStart: args.newBillingCycleStart,
      currentBillingCycleEnd: args.newBillingCycleEnd,
    });

    return { rolloverMinutes, totalMinutesAvailable: args.newIncludedMinutes + rolloverMinutes };
  },
});

// Zero out rollover and overage when a subscription is cancelled.
// Per pricing rules: rollover balance resets to 0 on plan cancellation.
export const resetRolloverOnCancellation = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return;
    await ctx.db.patch(args.orgId, {
      rolloverMinutes: 0,
      overageMinutesThisCycle: 0,
    });
  },
});

// Zero out rollover when a subscription is downgraded to a lower tier.
// Per pricing rules: rollover resets on downgrade to prevent gaming.
export const resetRolloverOnDowngrade = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return;
    await ctx.db.patch(args.orgId, { rolloverMinutes: 0 });
  },
});

// ─── Client-callable queries ────────────────────────────────────────────────

// Get org by Clerk org ID.
// Uses requireAuth only (not requireOrgMember) because this is the gateway
// query for all org pages. The Convex membership may not be synced yet when
// a user first joins via Clerk invite — strict membership checks on sensitive
// queries (getOrgMembers, getSubscriptionByClerkOrgId) still enforce isolation.
export const getOrganizationByClerkId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});

// Get the org that the authenticated user belongs to.
// When the user is in multiple orgs, pass clerkOrgId to select a specific one.
// Without clerkOrgId, returns the first membership (for single-org users).
export const getOrganizationForUser = query({
  args: { clerkOrgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) return null;

    if (args.clerkOrgId) {
      // Resolve via org lookup to guarantee deterministic result
      const clerkOrgId = args.clerkOrgId;
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
        .first();
      if (!org) return null;

      // Verify the user is actually a member
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_org_and_user", (q) => q.eq("orgId", org._id).eq("userId", user._id))
        .first();
      if (!membership) return null;

      return org;
    }

    // Fallback: return first membership's org (single-org users)
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) return null;

    return ctx.db.get(membership.orgId);
  },
});

// ─── Client-callable mutations (owner/admin only) ────────────────────────────

// Update org's credit pool mode (shared vs individual per-member allocation)
export const updateCreditPoolMode = mutation({
  args: {
    orgId: v.id("organizations"),
    mode: v.union(v.literal("shared"), v.literal("individual")),
  },
  handler: async (ctx, args) => {
    await requireOrgAdminOrOwner(ctx, args.orgId);
    await ctx.db.patch(args.orgId, { creditPoolMode: args.mode });
  },
});

// ─── Internal queries ───────────────────────────────────────────────────────

// Get org by Convex ID (for internal webhook handlers)
export const getById = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => ctx.db.get(args.orgId),
});

// Get org by Clerk org ID (for webhook handlers that only have clerkOrgId)
export const getByClerkOrgId = internalQuery({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first(),
});

// Add purchased credits (minutes) to org pool (called from Stripe webhook for org admin purchases)
export const addOrgCredits = internalMutation({
  args: {
    orgId: v.id("organizations"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");
    await ctx.db.patch(args.orgId, {
      totalMinutesAvailable: (org.totalMinutesAvailable ?? 0) + args.minutes,
    });
  },
});

// Persist the Stripe customer ID on an org after first successful checkout
export const updateStripeCustomerId = internalMutation({
  args: {
    orgId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error(`Organization not found: ${args.orgId}`);
    // Idempotent – skip if already set to the same value
    if (org.stripeCustomerId === args.stripeCustomerId) return;
    await ctx.db.patch(args.orgId, { stripeCustomerId: args.stripeCustomerId });
  },
});

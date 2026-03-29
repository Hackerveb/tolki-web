import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    credits: v.number(),
    totalCreditsEverPurchased: v.number(),
    defaultLanguage: v.optional(v.string()),
    defaultSourceLanguage: v.optional(v.string()),
    defaultTargetLanguage: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    createdAt: v.number(),
    lastActive: v.number(),
  })
    .index("by_clerk_id", ["clerkId"]),

  creditPurchases: defineTable({
    userId: v.id("users"),
    amount: v.number(), // Amount in cents
    credits: v.number(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()), // Legacy field from old test data
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    purchasedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_session_id", ["stripeSessionId"]),

  usageSessions: defineTable({
    userId: v.id("users"),
    orgId: v.optional(v.id("organizations")), // Set when session is billed against org subscription
    creditsUsed: v.number(),
    secondsUsed: v.optional(v.number()), // Track exact seconds of usage (optional for migration)
    languageFrom: v.string(),
    languageTo: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["userId", "isActive"]),

  // Multi-tenant organizations (synced from Clerk Organizations)
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    stripeCustomerId: v.optional(v.string()),
    creditPoolMode: v.union(v.literal("shared"), v.literal("individual")),
    totalMinutesAvailable: v.number(), // included minutes + rollover
    minutesUsedThisCycle: v.number(),
    rolloverMinutes: v.number(),
    overageMinutesThisCycle: v.optional(v.number()), // Minutes used beyond the included pool; reported to Stripe at cycle end
    currentBillingCycleStart: v.optional(v.number()),
    currentBillingCycleEnd: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clerk_org_id", ["clerkOrgId"]),

  // User memberships within organizations
  memberships: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    clerkMembershipId: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    minuteAllocation: v.optional(v.number()), // Only for individual creditPoolMode
    minutesUsedThisCycle: v.number(),
    joinedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_and_user", ["orgId", "userId"]),

  // Stripe subscription records for organizations
  subscriptions: defineTable({
    orgId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    tier: v.union(
      v.literal("free"),
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("trialing")
    ),
    includedMinutes: v.number(), // 60 / 300 / 2000 depending on tier (CEO-approved, TOL-128)
    overageRateNok: v.number(), // 4.0 / 3.5 / 3.0 NOK per minute (CEO-approved, TOL-128)
    billingInterval: v.union(v.literal("monthly"), v.literal("annual")),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),
});
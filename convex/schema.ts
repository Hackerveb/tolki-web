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
    createdAt: v.number(),
    lastActive: v.number(),
    // TEMPORARY: Remove this line AFTER running migrations:removeHasSeenOnboardingField
    hasSeenOnboarding: v.optional(v.boolean()),
  })
    .index("by_clerk_id", ["clerkId"]),

  creditPurchases: defineTable({
    userId: v.id("users"),
    amount: v.number(), // Amount in cents
    credits: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    purchasedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_id", ["stripePaymentIntentId"]),

  usageSessions: defineTable({
    userId: v.id("users"),
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
});
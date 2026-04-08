import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { FREE_SIGNUP_CREDITS } from "../constants/billing";

// Helper: verify the caller is authenticated and matches the clerkId argument
async function verifyIdentity(ctx: { auth: { getUserIdentity: () => Promise<any> } }, clerkId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  if (identity.subject !== clerkId) throw new Error("Forbidden");
  return identity;
}

// Create or update user when they sign in via Clerk
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        lastActive: Date.now(),
      });
      return existingUser._id;
    } else {
      // Create new user with free credits and initial free minute balance
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        credits: FREE_SIGNUP_CREDITS,
        totalCreditsEverPurchased: 0,
        freeMinutesBalance: 20,
        lastFreeMinutesReset: Date.now(),
        createdAt: Date.now(),
        lastActive: Date.now(),
      });
      return userId;
    }
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    return user;
  },
});

// Get user's credit balance
export const getCreditsBalance = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return 0;
    }

    return user.credits;
  },
});

// Update user's default language preference
export const updateDefaultLanguage = mutation({
  args: {
    clerkId: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      defaultLanguage: args.language,
    });
  },
});

// Add credits after successful purchase (internal only — not callable from client)
export const addCredits = internalMutation({
  args: {
    clerkId: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      credits: user.credits + args.credits,
      totalCreditsEverPurchased: user.totalCreditsEverPurchased + args.credits,
      lastActive: Date.now(),
    });

    return user.credits + args.credits; // Return new balance
  },
});

// Upsert user by Clerk ID (INTERNAL ONLY — sync-memberships, no client auth needed)
export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        lastActive: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      credits: FREE_SIGNUP_CREDITS,
      totalCreditsEverPurchased: 0,
      freeMinutesBalance: 20,
      lastFreeMinutesReset: Date.now(),
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
  },
});

// Get user with all details
export const getUserDetails = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Get active session if any
    const activeSession = await ctx.db
      .query("usageSessions")
      .withIndex("by_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    // Get recent purchase history (last 5)
    const recentPurchases = await ctx.db
      .query("creditPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(5);

    return {
      ...user,
      activeSession,
      recentPurchases,
    };
  },
});

// Delete user account and all associated data
export const deleteUserAccount = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // End any active sessions first
    const activeSessions = await ctx.db
      .query("usageSessions")
      .withIndex("by_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
        endedAt: Date.now(),
      });
    }

    // Delete all usage sessions
    const allSessions = await ctx.db
      .query("usageSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    // Delete all credit purchases
    const allPurchases = await ctx.db
      .query("creditPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const purchase of allPurchases) {
      await ctx.db.delete(purchase._id);
    }

    // Finally, delete the user
    await ctx.db.delete(user._id);

    return { success: true, message: "Account deleted successfully" };
  },
});

// Mark onboarding as completed and save language preferences
export const completeOnboarding = mutation({
  args: {
    clerkId: v.string(),
    sourceLanguage: v.string(),
    targetLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      defaultSourceLanguage: args.sourceLanguage,
      defaultTargetLanguage: args.targetLanguage,
      defaultLanguage: args.sourceLanguage,
      lastActive: Date.now(),
    });
  },
});

// Check if user has completed onboarding
export const hasCompletedOnboarding = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user?.onboardingCompleted ?? false;
  },
});

// Look up a user by Clerk ID (INTERNAL ONLY — webhook handlers, not callable from client)
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first(),
});

// List all users (INTERNAL ONLY — admin/dashboard, not callable from client)
export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

// Get user by Convex ID (INTERNAL ONLY — webhook handlers)
export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

// Reset free minutes for eligible users (INTERNAL ONLY — called by daily cron)
// Resets freeMinutesBalance to 20 for private users who haven't been reset in 30 days.
// Skips users with an active subscription or org membership.
export const resetFreeMinutes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const users = await ctx.db.query("users").collect();

    let resetCount = 0;
    for (const user of users) {
      // Skip if user has an active (non-canceled) subscription
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.neq(q.field("status"), "canceled"))
        .first();
      if (subscription) continue;

      // Skip if user belongs to an org
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (membership) continue;

      // Reset if never reset or last reset was > 30 days ago
      const lastReset = user.lastFreeMinutesReset;
      if (lastReset === undefined || now - lastReset > THIRTY_DAYS_MS) {
        await ctx.db.patch(user._id, {
          freeMinutesBalance: 20,
          lastFreeMinutesReset: now,
        });
        resetCount++;
      }
    }

    return { resetCount };
  },
});

// Save Stripe customer ID on user record (INTERNAL ONLY — webhook handler)
export const updateStripeCustomerId = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { stripeCustomerId: args.stripeCustomerId });
  },
});


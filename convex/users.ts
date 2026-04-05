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
      // Create new user with free credits
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        credits: FREE_SIGNUP_CREDITS,
        totalCreditsEverPurchased: 0,
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

// Deduct credits from user (called every minute during translation)
export const deductCredits = mutation({
  args: {
    clerkId: v.string(),
    credits: v.number(),
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

    if (user.credits < args.credits) {
      throw new Error("Insufficient credits");
    }

    // Handle decimal credits with proper rounding
    const newBalance = Math.round((user.credits - args.credits) * 100) / 100;

    await ctx.db.patch(user._id, {
      credits: newBalance,
      lastActive: Date.now(),
    });

    return newBalance; // Return new balance
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


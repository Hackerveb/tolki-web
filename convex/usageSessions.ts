import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { MIN_SESSION_CREDITS, MIN_SESSION_DURATION_SEC } from "../constants/billing";

// Start a new translation session
export const startSession = mutation({
  args: {
    clerkId: v.string(),
    languageFrom: v.string(),
    languageTo: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has credits
    if (user.credits <= 0) {
      throw new Error("Insufficient credits");
    }

    // End any existing active sessions
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

    // Deduct minimum session charge upfront
    if (user.credits < MIN_SESSION_CREDITS) {
      throw new Error("Insufficient credits. Minimum credits required to start a session");
    }

    // Deduct minimum charge immediately
    await ctx.db.patch(user._id, {
      credits: Math.round((user.credits - MIN_SESSION_CREDITS) * 100) / 100,
      lastActive: Date.now(),
    });

    // Create new session with minimum charge already applied
    const sessionId = await ctx.db.insert("usageSessions", {
      userId: user._id,
      creditsUsed: MIN_SESSION_CREDITS,
      secondsUsed: MIN_SESSION_DURATION_SEC,
      languageFrom: args.languageFrom,
      languageTo: args.languageTo,
      startedAt: Date.now(),
      isActive: true,
    });

    return sessionId;
  },
});

// End a translation session
export const endSession = mutation({
  args: {
    sessionId: v.id("usageSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.isActive) {
      return; // Session already ended
    }

    await ctx.db.patch(args.sessionId, {
      isActive: false,
      endedAt: Date.now(),
    });

    // Calculate actual seconds used and final credit charge
    const actualSecondsUsed = Math.floor((Date.now() - session.startedAt) / 1000);
    // Use stored secondsUsed if available, otherwise calculate from duration
    const storedSecondsUsed = session.secondsUsed || 0;
    const totalSecondsUsed = Math.max(actualSecondsUsed, storedSecondsUsed);
    const finalCreditsUsed = Math.max(
      MIN_SESSION_CREDITS,
      Math.round((totalSecondsUsed / 60) * 1 * 100) / 100
    );

    // Update session with final values
    await ctx.db.patch(args.sessionId, {
      secondsUsed: totalSecondsUsed,
      creditsUsed: finalCreditsUsed,
    });

    // Return final session details
    return {
      creditsUsed: finalCreditsUsed,
      secondsUsed: totalSecondsUsed,
      duration: Date.now() - session.startedAt,
    };
  },
});

// Update fractional credits (called every 3 seconds)
export const updateFractionalCredits = mutation({
  args: {
    clerkId: v.string(),
    secondsToAdd: v.number(), // Usually 3 seconds
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get active session
    const activeSession = await ctx.db
      .query("usageSessions")
      .withIndex("by_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    if (!activeSession) {
      throw new Error("No active session found");
    }

    // Calculate credits to deduct (0.05 per 3 seconds = 1 credit per 60 seconds)
    const creditsToDeduct = (args.secondsToAdd / 60) * 1;

    // Check if user has enough credits
    if (user.credits < creditsToDeduct) {
      // End session if insufficient credits
      const currentSeconds = activeSession.secondsUsed || 0;
      const finalSecondsUsed = currentSeconds + args.secondsToAdd;
      const finalCreditsUsed = Math.round((finalSecondsUsed / 60) * 1 * 100) / 100;

      await ctx.db.patch(activeSession._id, {
        isActive: false,
        endedAt: Date.now(),
        secondsUsed: finalSecondsUsed,
        creditsUsed: finalCreditsUsed,
      });

      // Deduct remaining credits
      await ctx.db.patch(user._id, {
        credits: 0,
        lastActive: Date.now(),
      });

      throw new Error("Insufficient credits - session ended");
    }

    // Update seconds used (handle optional field for migration)
    const currentSecondsUsed = activeSession.secondsUsed || 0;
    const newSecondsUsed = currentSecondsUsed + args.secondsToAdd;
    const newCreditsUsed = Math.round((newSecondsUsed / 60) * 1 * 100) / 100;

    // Deduct fractional credits from user
    const newBalance = Math.round((user.credits - creditsToDeduct) * 100) / 100;
    await ctx.db.patch(user._id, {
      credits: newBalance,
      lastActive: Date.now(),
    });

    // Update session
    await ctx.db.patch(activeSession._id, {
      secondsUsed: newSecondsUsed,
      creditsUsed: newCreditsUsed,
    });

    return {
      creditsRemaining: newBalance,
      sessionCreditsUsed: newCreditsUsed,
      secondsUsed: newSecondsUsed,
    };
  },
});

// Legacy function - kept for backwards compatibility but not used
export const incrementSessionCredits = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get active session
    const activeSession = await ctx.db
      .query("usageSessions")
      .withIndex("by_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    if (!activeSession) {
      throw new Error("No active session found");
    }

    // Legacy: 60 seconds = 1 credit (matches our current system of 1 credit/minute)
    const secondsToAdd = 60;
    const creditsToDeduct = (secondsToAdd / 60) * 1;

    // Check if user has enough credits
    if (user.credits < creditsToDeduct) {
      throw new Error("Insufficient credits");
    }

    // Update seconds used
    const currentSecondsUsed = activeSession.secondsUsed || 0;
    const newSecondsUsed = currentSecondsUsed + secondsToAdd;
    const newCreditsUsed = Math.round((newSecondsUsed / 60) * 1 * 100) / 100;

    // Deduct credits from user
    const newBalance = Math.round((user.credits - creditsToDeduct) * 100) / 100;
    await ctx.db.patch(user._id, {
      credits: newBalance,
      lastActive: Date.now(),
    });

    // Update session
    await ctx.db.patch(activeSession._id, {
      secondsUsed: newSecondsUsed,
      creditsUsed: newCreditsUsed,
    });

    return {
      creditsRemaining: newBalance,
      sessionCreditsUsed: newCreditsUsed,
      secondsUsed: newSecondsUsed,
    };
  },
});

// Get active session for a user
export const getActiveSession = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    const activeSession = await ctx.db
      .query("usageSessions")
      .withIndex("by_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    return activeSession;
  },
});

// Get session history for a user
export const getSessionHistory = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const query = ctx.db
      .query("usageSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    const sessions = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    return sessions.map(session => ({
      ...session,
      duration: session.endedAt ? session.endedAt - session.startedAt : null,
    }));
  },
});

// Get total credits used today
export const getCreditsUsedToday = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return 0;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    const sessions = await ctx.db
      .query("usageSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("startedAt"), todayStartTime))
      .collect();

    const totalCreditsToday = sessions.reduce(
      (sum, session) => sum + session.creditsUsed,
      0
    );

    return totalCreditsToday;
  },
});
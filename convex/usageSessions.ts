import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { MIN_SESSION_CREDITS, MIN_SESSION_DURATION_SEC } from "../constants/billing";

// Helper: verify the caller is authenticated and matches the clerkId argument
async function verifyIdentity(ctx: { auth: { getUserIdentity: () => Promise<any> } }, clerkId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  if (identity.subject !== clerkId) throw new Error("Forbidden");
  return identity;
}

// Start a new translation session.
// If the user belongs to an org with an active subscription, minutes are billed
// against the org pool. Otherwise falls back to personal credits (backward compat).
export const startSession = mutation({
  args: {
    clerkId: v.string(),
    languageFrom: v.string(),
    languageTo: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user belongs to an org with available minutes
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    let orgId: Id<"organizations"> | undefined;

    if (membership) {
      const org = await ctx.db.get(membership.orgId);

      if (org) {
        // Verify org has available minutes
        const MIN_MINUTES = MIN_SESSION_DURATION_SEC / 60;
        if (org.totalMinutesAvailable < MIN_MINUTES) {
          throw new Error("Organization has insufficient minutes. Please renew your subscription.");
        }

        // For individual mode, also check member allocation
        if (org.creditPoolMode === "individual" && membership.minuteAllocation !== undefined) {
          const remainingAllocation = membership.minuteAllocation - membership.minutesUsedThisCycle;
          if (remainingAllocation < MIN_MINUTES) {
            throw new Error("Your individual minute allocation is exhausted for this billing cycle.");
          }
        }

        orgId = org._id;
      }
    }

    if (!orgId) {
      // Fallback: personal credits
      if (user.credits < MIN_SESSION_CREDITS) {
        throw new Error("Insufficient credits. Minimum credits required to start a session");
      }
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

    if (orgId) {
      // Deduct minimum charge from org pool
      const minMinutes = MIN_SESSION_DURATION_SEC / 60;
      const org = await ctx.db.get(orgId);
      if (org) {
        await ctx.db.patch(orgId, {
          totalMinutesAvailable: Math.max(0, Math.round((org.totalMinutesAvailable - minMinutes) * 1000) / 1000),
          minutesUsedThisCycle: Math.round((org.minutesUsedThisCycle + minMinutes) * 1000) / 1000,
        });

        // For individual mode, also track member usage
        if (org.creditPoolMode === "individual" && membership) {
          await ctx.db.patch(membership._id, {
            minutesUsedThisCycle: Math.round((membership.minutesUsedThisCycle + minMinutes) * 1000) / 1000,
          });
        }
      }
    } else {
      // Deduct minimum charge from personal credits
      await ctx.db.patch(user._id, {
        credits: Math.round((user.credits - MIN_SESSION_CREDITS) * 100) / 100,
        lastActive: Date.now(),
      });
    }

    // Create new session with minimum charge already applied
    const sessionId = await ctx.db.insert("usageSessions", {
      userId: user._id,
      orgId,
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
    // Verify caller is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify the caller owns this session
    const sessionOwner = await ctx.db.get(session.userId);
    if (!sessionOwner || sessionOwner.clerkId !== identity.subject) {
      throw new Error("Forbidden");
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

// Update fractional credits/minutes (called every 3 seconds during an active session).
// If the session is tied to an org, deducts from the org's minute pool.
// Otherwise falls back to deducting personal credits.
export const updateFractionalCredits = mutation({
  args: {
    clerkId: v.string(),
    secondsToAdd: v.number(), // Usually 3 seconds
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

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

    // Minutes to deduct this interval (1 credit == 1 minute)
    const minutesToDeduct = args.secondsToAdd / 60;
    const creditsToDeduct = minutesToDeduct; // kept for backward compat naming

    const currentSecondsUsed = activeSession.secondsUsed || 0;
    const newSecondsUsed = currentSecondsUsed + args.secondsToAdd;
    const newCreditsUsed = Math.round((newSecondsUsed / 60) * 1 * 100) / 100;

    if (activeSession.orgId) {
      // ── Org-billed session ──────────────────────────────────────────────
      const org = await ctx.db.get(activeSession.orgId);

      if (!org || org.totalMinutesAvailable < minutesToDeduct) {
        // End session — org is out of minutes
        await ctx.db.patch(activeSession._id, {
          isActive: false,
          endedAt: Date.now(),
          secondsUsed: newSecondsUsed,
          creditsUsed: newCreditsUsed,
        });

        if (org) {
          await ctx.db.patch(org._id, {
            totalMinutesAvailable: 0,
            minutesUsedThisCycle: org.minutesUsedThisCycle + org.totalMinutesAvailable,
          });
        }

        throw new Error("Organization has run out of minutes - session ended");
      }

      // For individual mode, check member allocation too
      if (org.creditPoolMode === "individual") {
        const membership = await ctx.db
          .query("memberships")
          .withIndex("by_org_and_user", (q) =>
            q.eq("orgId", activeSession.orgId!).eq("userId", user._id)
          )
          .first();

        if (membership && membership.minuteAllocation !== undefined) {
          const remainingAllocation = membership.minuteAllocation - membership.minutesUsedThisCycle;
          if (remainingAllocation < minutesToDeduct) {
            await ctx.db.patch(activeSession._id, {
              isActive: false,
              endedAt: Date.now(),
              secondsUsed: newSecondsUsed,
              creditsUsed: newCreditsUsed,
            });
            throw new Error("Individual minute allocation exhausted - session ended");
          }

          await ctx.db.patch(membership._id, {
            minutesUsedThisCycle: Math.round((membership.minutesUsedThisCycle + minutesToDeduct) * 1000) / 1000,
          });
        }
      }

      // Deduct from org pool
      await ctx.db.patch(org._id, {
        totalMinutesAvailable: Math.round((org.totalMinutesAvailable - minutesToDeduct) * 1000) / 1000,
        minutesUsedThisCycle: Math.round((org.minutesUsedThisCycle + minutesToDeduct) * 1000) / 1000,
      });

      await ctx.db.patch(activeSession._id, {
        secondsUsed: newSecondsUsed,
        creditsUsed: newCreditsUsed,
      });

      return {
        creditsRemaining: org.totalMinutesAvailable - minutesToDeduct,
        sessionCreditsUsed: newCreditsUsed,
        secondsUsed: newSecondsUsed,
        billedToOrg: true,
      };
    } else {
      // ── Personal credits (legacy / no-org path) ──────────────────────────
      if (user.credits < creditsToDeduct) {
        // End session if insufficient credits
        const finalCreditsUsed = Math.round((newSecondsUsed / 60) * 1 * 100) / 100;

        await ctx.db.patch(activeSession._id, {
          isActive: false,
          endedAt: Date.now(),
          secondsUsed: newSecondsUsed,
          creditsUsed: finalCreditsUsed,
        });

        await ctx.db.patch(user._id, {
          credits: 0,
          lastActive: Date.now(),
        });

        throw new Error("Insufficient credits - session ended");
      }

      const newBalance = Math.round((user.credits - creditsToDeduct) * 100) / 100;
      await ctx.db.patch(user._id, {
        credits: newBalance,
        lastActive: Date.now(),
      });

      await ctx.db.patch(activeSession._id, {
        secondsUsed: newSecondsUsed,
        creditsUsed: newCreditsUsed,
      });

      return {
        creditsRemaining: newBalance,
        sessionCreditsUsed: newCreditsUsed,
        secondsUsed: newSecondsUsed,
        billedToOrg: false,
      };
    }
  },
});

// Legacy function - kept for backwards compatibility but not used
export const incrementSessionCredits = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyIdentity(ctx, args.clerkId);

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
    await verifyIdentity(ctx, args.clerkId);

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
    await verifyIdentity(ctx, args.clerkId);

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
    await verifyIdentity(ctx, args.clerkId);

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
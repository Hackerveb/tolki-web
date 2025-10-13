import { mutation } from "./_generated/server";

/**
 * MIGRATION: Remove hasSeenOnboarding field from all users
 *
 * Run this ONCE after initial deployment, then DELETE THIS FILE.
 *
 * How to run:
 *   npx convex run migrations:removeHasSeenOnboardingField
 *
 * Expected output:
 *   { success: true, message: "Removed hasSeenOnboarding from X users", totalUsers: Y }
 */
export const removeHasSeenOnboardingField = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    let updatedCount = 0;

    for (const user of allUsers) {
      // @ts-ignore - accessing field that may or may not exist
      if (user.hasSeenOnboarding !== undefined) {
        await ctx.db.patch(user._id, {
          // @ts-ignore - removing field
          hasSeenOnboarding: undefined,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `Removed hasSeenOnboarding from ${updatedCount} users`,
      totalUsers: allUsers.length,
      updatedCount,
    };
  },
});

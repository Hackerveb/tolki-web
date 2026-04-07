import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuth, requireOrgAdminOrOwner, requireOrgMember, checkOrgMember } from "./lib/auth";

// ─── Internal mutations (called from Clerk webhooks) ────────────────────────

// Add a member when Clerk fires organizationMembership.created
export const addMember = internalMutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    clerkMembershipId: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    // Idempotency: skip if membership already exists
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) => q.eq("orgId", args.orgId).eq("userId", args.userId))
      .first();

    if (existing) {
      // Update role/clerkMembershipId if changed
      if (existing.role !== args.role || (args.clerkMembershipId && existing.clerkMembershipId !== args.clerkMembershipId)) {
        await ctx.db.patch(existing._id, {
          role: args.role,
          ...(args.clerkMembershipId && { clerkMembershipId: args.clerkMembershipId }),
        });
      }
      return existing._id;
    }

    return ctx.db.insert("memberships", {
      orgId: args.orgId,
      userId: args.userId,
      clerkMembershipId: args.clerkMembershipId,
      role: args.role,
      minutesUsedThisCycle: 0,
      joinedAt: Date.now(),
    });
  },
});

// Remove a member when Clerk fires organizationMembership.deleted
export const removeMember = internalMutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) => q.eq("orgId", args.orgId).eq("userId", args.userId))
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }
  },
});

// Deduct minutes from a member's personal allocation (individual mode only)
export const deductMemberMinutes = internalMutation({
  args: {
    membershipId: v.id("memberships"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership not found");

    const newUsed = membership.minutesUsedThisCycle + args.minutes;

    // Enforce individual allocation cap if set
    if (membership.minuteAllocation !== undefined && newUsed > membership.minuteAllocation) {
      throw new Error("Member's minute allocation exceeded");
    }

    await ctx.db.patch(args.membershipId, {
      minutesUsedThisCycle: Math.round(newUsed * 1000) / 1000,
    });

    return { minutesUsedThisCycle: newUsed };
  },
});

// Reset all member minute counters on billing cycle renewal
export const resetMemberMinutes = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const member of members) {
      await ctx.db.patch(member._id, { minutesUsedThisCycle: 0 });
    }
  },
});

// ─── Client-callable mutations (admin/owner only) ───────────────────────────

// Update a member's role (owner/admin only). Cannot promote to owner or change the owner's role.
export const updateMemberRole = mutation({
  args: {
    orgId: v.id("organizations"),
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireOrgAdminOrOwner(ctx, args.orgId);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) => q.eq("orgId", args.orgId).eq("userId", args.targetUserId))
      .first();

    if (!membership) throw new Error("Membership not found");
    if (membership.role === "owner") throw new Error("Cannot change the owner's role");

    await ctx.db.patch(membership._id, { role: args.role });
  },
});

// Set a member's individual minute allocation (admin only, individual mode)
export const setMemberAllocation = mutation({
  args: {
    orgId: v.id("organizations"),
    targetUserId: v.id("users"),
    minuteAllocation: v.optional(v.number()), // undefined clears the allocation
  },
  handler: async (ctx, args) => {
    await requireOrgAdminOrOwner(ctx, args.orgId);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) => q.eq("orgId", args.orgId).eq("userId", args.targetUserId))
      .first();

    if (!membership) throw new Error("Membership not found");

    await ctx.db.patch(membership._id, { minuteAllocation: args.minuteAllocation });
  },
});

// ─── Client-callable queries ─────────────────────────────────────────────────

// List all members of an org. Returns empty if caller's membership isn't synced yet.
export const getOrgMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const member = await checkOrgMember(ctx, args.orgId);
    if (!member) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Enrich with user data — return flat fields matching the MemberData interface
    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          membershipId: m._id,
          userId: m.userId,
          role: m.role,
          minutesUsedThisCycle: m.minutesUsedThisCycle,
          minuteAllocation: m.minuteAllocation ?? null,
          joinedAt: m.joinedAt,
          userName: user?.name ?? '',
          userEmail: user?.email ?? '',
          userClerkId: user?.clerkId ?? '',
        };
      })
    );

    return enriched;
  },
});

// Get per-member minutes usage for the current cycle. Returns empty if not a member.
export const getMemberUsage = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const member = await checkOrgMember(ctx, args.orgId);
    if (!member) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return memberships.map((m) => ({
      userId: m.userId,
      role: m.role,
      minutesUsedThisCycle: m.minutesUsedThisCycle,
      minuteAllocation: m.minuteAllocation,
    }));
  },
});

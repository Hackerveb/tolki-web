import { Id } from "../_generated/dataModel";

// Verify caller is authenticated. Returns the Clerk identity.
export async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

// Look up Convex user by Clerk subject ID.
export async function getUserByClerkId(ctx: any, clerkId: string) {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
}

// Verify caller is an owner or admin of the given org.
// Returns { identity, user, membership }.
export async function requireOrgAdminOrOwner(ctx: any, orgId: Id<"organizations">) {
  const identity = await requireAuth(ctx);
  const user = await getUserByClerkId(ctx, identity.subject);
  if (!user) throw new Error("User not found");

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_org_and_user", (q: any) => q.eq("orgId", orgId).eq("userId", user._id))
    .first();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Forbidden: owner or admin required");
  }

  return { identity, user, membership };
}

// Verify caller is a member of the given org (any role: owner, admin, or member).
// Returns { identity, user, membership }.
export async function requireOrgMember(ctx: any, orgId: Id<"organizations">) {
  const identity = await requireAuth(ctx);
  const user = await getUserByClerkId(ctx, identity.subject);
  if (!user) throw new Error("User not found");

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_org_and_user", (q: any) => q.eq("orgId", orgId).eq("userId", user._id))
    .first();

  if (!membership) {
    throw new Error("Forbidden: not a member of this organization");
  }

  return { identity, user, membership };
}

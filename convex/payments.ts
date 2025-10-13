import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Credit packages
export const creditPackages = [
  { credits: 90, price: 599, label: "90 credits", description: "$5.99" },
  { credits: 180, price: 1099, label: "180 credits", description: "$10.99" },
  { credits: 1080, price: 5999, label: "1080 credits", description: "$59.99" },
  { credits: 2160, price: 11499, label: "2160 credits", description: "$114.99" },
  { credits: 4320, price: 21999, label: "4320 credits", description: "$219.99" },
];

// Create a payment intent for purchasing credits
export const createPaymentIntent = action({
  args: {
    clerkId: v.string(),
    packageIndex: v.number(), // Index of the credit package
  },
  handler: async (ctx, args): Promise<{ clientSecret: string; purchaseId: Id<"creditPurchases">; amount: number; credits: number }> => {
    // Get user
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const creditPackage = creditPackages[args.packageIndex];
    if (!creditPackage) {
      throw new Error("Invalid package selected");
    }

    // Create purchase record
    const purchaseId = await ctx.runMutation(api.payments.createPurchaseRecord, {
      userId: user._id,
      amount: creditPackage.price,
      credits: creditPackage.credits,
    });

    // In a real app, you would create a Stripe PaymentIntent here
    // For now, return mock data
    return {
      clientSecret: `mock_secret_${purchaseId}`,
      purchaseId,
      amount: creditPackage.price,
      credits: creditPackage.credits,
    };
  },
});

// Create a purchase record (internal mutation)
export const createPurchaseRecord = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const purchaseId = await ctx.db.insert("creditPurchases", {
      userId: args.userId,
      amount: args.amount,
      credits: args.credits,
      status: "pending",
      purchasedAt: Date.now(),
    });

    return purchaseId;
  },
});

// Confirm payment and add credits to user
export const confirmPayment = mutation({
  args: {
    purchaseId: v.id("creditPurchases"),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    if (purchase.status === "completed") {
      throw new Error("Purchase already completed");
    }

    // Update purchase status
    await ctx.db.patch(args.purchaseId, {
      status: "completed",
      stripePaymentIntentId: args.stripePaymentIntentId,
    });

    // Get user and add credits
    const user = await ctx.db.get(purchase.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(purchase.userId, {
      credits: user.credits + purchase.credits,
      totalCreditsEverPurchased: user.totalCreditsEverPurchased + purchase.credits,
    });

    return {
      newBalance: user.credits + purchase.credits,
      creditsAdded: purchase.credits,
    };
  },
});

// Mark payment as failed
export const markPaymentFailed = mutation({
  args: {
    purchaseId: v.id("creditPurchases"),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.purchaseId, {
      status: "failed",
      stripePaymentIntentId: args.stripePaymentIntentId,
    });
  },
});

// Record a purchase from Stripe webhook and add credits
export const recordPurchase = mutation({
  args: {
    clerkId: v.string(),
    credits: v.number(),
    amount: v.number(),
    stripeSessionId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("pending")),
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

    // Create purchase record
    const purchaseId = await ctx.db.insert("creditPurchases", {
      userId: user._id,
      amount: args.amount * 100, // Convert dollars to cents for storage
      credits: args.credits,
      status: args.status,
      stripePaymentIntentId: args.stripeSessionId,
      purchasedAt: Date.now(),
    });

    // If completed, add credits to user
    if (args.status === "completed") {
      await ctx.db.patch(user._id, {
        credits: user.credits + args.credits,
        totalCreditsEverPurchased: user.totalCreditsEverPurchased + args.credits,
      });
    }

    return {
      purchaseId,
      newBalance: args.status === "completed" ? user.credits + args.credits : user.credits,
      creditsAdded: args.status === "completed" ? args.credits : 0,
    };
  },
});

// Get purchase history for a user
export const getPurchaseHistory = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const purchases = await ctx.db
      .query("creditPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return purchases;
  },
});

// Get recent successful purchases (for billing history)
export const getRecentPurchases = query({
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
      .query("creditPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    const purchases = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    // Filter for completed purchases and format for display
    return purchases
      .filter(p => p.status === "completed")
      .map(purchase => ({
        id: purchase._id,
        date: purchase.purchasedAt,
        amount: purchase.amount / 100, // Convert cents to dollars
        credits: purchase.credits,
        status: purchase.status,
        description: `${purchase.credits} credits purchased`,
      }));
  },
});

// Simulate a purchase completion (for testing without Stripe)
export const simulatePurchase = action({
  args: {
    clerkId: v.string(),
    packageIndex: v.number(),
  },
  handler: async (ctx, args): Promise<{ newBalance: number; creditsAdded: number }> => {
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const creditPackage = creditPackages[args.packageIndex];
    if (!creditPackage) {
      throw new Error("Invalid package selected");
    }

    // Create and immediately complete purchase
    const purchaseId = await ctx.runMutation(api.payments.createPurchaseRecord, {
      userId: user._id,
      amount: creditPackage.price,
      credits: creditPackage.credits,
    });

    const result = await ctx.runMutation(api.payments.confirmPayment, {
      purchaseId,
      stripePaymentIntentId: `simulated_${Date.now()}`,
    });

    return result;
  },
});
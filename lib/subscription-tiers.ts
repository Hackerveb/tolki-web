/**
 * Subscription tier configuration and Stripe price ID → tier metadata mapping.
 * Server-only: reads env vars at runtime.
 *
 * Tiers (board directive 2026-03-29, final pricing TBD from CFO):
 *   Free   →  20 min/mo,  non-accumulative (no rollover, no overage)
 *   Small  →  TBD min/mo, ~190 NOK/mo
 *   Medium →  TBD min/mo, ~990 NOK/mo
 *   Large  →  TBD min/mo, ~4,990 NOK/mo
 *
 * Target charge: 2.5–3.5 NOK/min depending on tier.
 * Actual cost: ~0.15 NOK/min.
 *
 * Credit add-ons available for subscribers (not free tier).
 * Pricing awaiting CFO update at TOL-128.
 */

export type SubscriptionTier = 'free' | 'small' | 'medium' | 'large';

export interface TierMeta {
  tier: SubscriptionTier;
  includedMinutes: number;
  overageRateNok: number;
  billingInterval: 'monthly' | 'annual';
}

// Placeholder minutes — will be updated once CFO completes TOL-128 pricing analysis.
// Using rough estimates: price / ~3 NOK per minute.
const TIER_DEFINITIONS: Array<{
  tier: SubscriptionTier;
  includedMinutes: number;
  overageRateNok: number;
  monthlyEnvKey: string;
  annualEnvKey: string;
}> = [
  {
    tier: 'small',
    includedMinutes: 60,    // ~190 NOK / 3.17 NOK/min
    overageRateNok: 3.5,
    monthlyEnvKey: 'STRIPE_PRICE_SMALL_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_SMALL_ANNUAL',
  },
  {
    tier: 'medium',
    includedMinutes: 330,   // ~990 NOK / 3.0 NOK/min
    overageRateNok: 3.0,
    monthlyEnvKey: 'STRIPE_PRICE_MEDIUM_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_MEDIUM_ANNUAL',
  },
  {
    tier: 'large',
    includedMinutes: 1800,  // ~4990 NOK / 2.77 NOK/min
    overageRateNok: 2.5,
    monthlyEnvKey: 'STRIPE_PRICE_LARGE_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_LARGE_ANNUAL',
  },
];

function buildPriceMap(): Map<string, TierMeta> {
  const map = new Map<string, TierMeta>();
  for (const def of TIER_DEFINITIONS) {
    const monthly = process.env[def.monthlyEnvKey];
    const annual = process.env[def.annualEnvKey];
    if (monthly) {
      map.set(monthly, {
        tier: def.tier,
        includedMinutes: def.includedMinutes,
        overageRateNok: def.overageRateNok,
        billingInterval: 'monthly',
      });
    }
    if (annual) {
      map.set(annual, {
        tier: def.tier,
        includedMinutes: def.includedMinutes * 12,
        overageRateNok: def.overageRateNok,
        billingInterval: 'annual',
      });
    }
  }
  return map;
}

const PRICE_MAP = buildPriceMap();

/** Returns tier metadata for a given Stripe price ID, or null if unrecognised. */
export function getTierForPriceId(priceId: string): TierMeta | null {
  return PRICE_MAP.get(priceId) ?? null;
}

/** Free tier configuration (no Stripe product — handled internally). */
export const FREE_TIER = {
  tier: 'free' as const,
  includedMinutes: 20,
  overageRateNok: 0,        // Free tier has no overage — session blocked when exhausted
  rolloverEnabled: false,    // Non-accumulative per board directive
  priceNok: 0,
};

/** Included minutes per tier (placeholder — update after TOL-128). */
export const TIER_INCLUDED_MINUTES: Record<SubscriptionTier, number> = {
  free: 20,
  small: 60,
  medium: 330,
  large: 1800,
};

/** Overage rate in NOK per minute per tier. */
export const TIER_OVERAGE_RATE_NOK: Record<SubscriptionTier, number> = {
  free: 0,
  small: 3.5,
  medium: 3.0,
  large: 2.5,
};

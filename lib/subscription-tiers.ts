/**
 * Subscription tier configuration and Stripe price ID → tier metadata mapping.
 * Server-only: reads env vars at runtime.
 *
 * Tiers (CEO-approved pricing 2026-03-29, TOL-128):
 *   Free   →  20 min/mo,  non-accumulative (no rollover, no overage, service pauses at 0)
 *   Small  →  60 min/mo,  190 NOK/mo, overage 4.00 NOK/min
 *   Medium →  300 min/mo, 990 NOK/mo, overage 3.50 NOK/min
 *   Large  →  2000 min/mo, 4990 NOK/mo, overage 3.00 NOK/min
 *
 * Annual pricing (~17% discount):
 *   Small:  158 NOK/mo (1 896 NOK/yr)
 *   Medium: 825 NOK/mo (9 900 NOK/yr)
 *   Large:  4 158 NOK/mo (49 896 NOK/yr)
 */

export type SubscriptionTier = 'free' | 'small' | 'medium' | 'large';

export interface TierMeta {
  tier: SubscriptionTier;
  includedMinutes: number;
  overageRateNok: number;
  billingInterval: 'monthly' | 'annual';
}

const TIER_DEFINITIONS: Array<{
  tier: SubscriptionTier;
  includedMinutes: number;
  overageRateNok: number;
  monthlyEnvKey: string;
  annualEnvKey: string;
}> = [
  {
    tier: 'small',
    includedMinutes: 60,
    overageRateNok: 4.0,
    monthlyEnvKey: 'STRIPE_PRICE_SMALL_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_SMALL_ANNUAL',
  },
  {
    tier: 'medium',
    includedMinutes: 300,
    overageRateNok: 3.5,
    monthlyEnvKey: 'STRIPE_PRICE_MEDIUM_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_MEDIUM_ANNUAL',
  },
  {
    tier: 'large',
    includedMinutes: 2000,
    overageRateNok: 3.0,
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
  rolloverEnabled: false,    // Non-accumulative: resets monthly, no rollover
  priceNok: 0,
};

/** Included minutes per billing cycle per tier (CEO-approved, TOL-128). */
export const TIER_INCLUDED_MINUTES: Record<SubscriptionTier, number> = {
  free: 20,
  small: 60,
  medium: 300,
  large: 2000,
};

/** Overage rate in NOK per minute per tier (CEO-approved, TOL-128). */
export const TIER_OVERAGE_RATE_NOK: Record<SubscriptionTier, number> = {
  free: 0,
  small: 4.0,
  medium: 3.5,
  large: 3.0,
};

/**
 * Subscription tier configuration and Stripe price ID → tier metadata mapping.
 * Server-only: reads env vars at runtime.
 *
 * Tiers and included minutes:
 *   Starter      →  60 min/mo,  12 NOK/min overage
 *   Professional → 200 min/mo,  10 NOK/min overage
 *   Business     → 600 min/mo,   8 NOK/min overage
 */

export type SubscriptionTier = 'starter' | 'professional' | 'business';

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
    tier: 'starter',
    includedMinutes: 60,
    overageRateNok: 12,
    monthlyEnvKey: 'STRIPE_PRICE_STARTER_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_STARTER_ANNUAL',
  },
  {
    tier: 'professional',
    includedMinutes: 200,
    overageRateNok: 10,
    monthlyEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
  },
  {
    tier: 'business',
    includedMinutes: 600,
    overageRateNok: 8,
    monthlyEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    annualEnvKey: 'STRIPE_PRICE_BUSINESS_ANNUAL',
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
        includedMinutes: def.includedMinutes,
        overageRateNok: def.overageRateNok,
        billingInterval: 'annual',
      });
    }
  }
  return map;
}

// Built once per cold-start; env vars are stable at runtime.
const PRICE_MAP = buildPriceMap();

/** Returns tier metadata for a given Stripe price ID, or null if unrecognised. */
export function getTierForPriceId(priceId: string): TierMeta | null {
  return PRICE_MAP.get(priceId) ?? null;
}

/** Included minutes per tier (for non-price-ID lookups, e.g. plan change display). */
export const TIER_INCLUDED_MINUTES: Record<SubscriptionTier, number> = {
  starter: 60,
  professional: 200,
  business: 600,
};

/** Overage rate in NOK per minute per tier. */
export const TIER_OVERAGE_RATE_NOK: Record<SubscriptionTier, number> = {
  starter: 12,
  professional: 10,
  business: 8,
};

// Flexible per-minute credit purchase model (updated 2026-04-05, TOL-143).
// All users can buy credits — including Free tier users.
// Price = minutes × rate_per_minute (rate depends on active subscription tier).
//
// Rates (NOK per minute):
//   No subscription / Free tier: 3.50 NOK/min
//   Active tier:                 3.00 NOK/min
//   Enterprise tier:             2.00 NOK/min

import type { SubscriptionTier } from './subscription-tiers';

/** Per-minute credit rates in NOK, keyed by subscription tier (or 'none'). */
export const CREDIT_RATES_NOK_PER_MIN: Record<string, number> = {
  none: 3.50,
  free: 3.50,
  active: 3.00,
  enterprise: 2.00,
};

export const MIN_CREDIT_PURCHASE_MINUTES = 1;
export const MAX_CREDIT_PURCHASE_MINUTES = 10000;

/** Returns the NOK per-minute rate for a given tier (or 'none' if no subscription). */
export function getCreditRateForTier(tier: SubscriptionTier | 'none'): number {
  return CREDIT_RATES_NOK_PER_MIN[tier] ?? CREDIT_RATES_NOK_PER_MIN.none;
}

// ─── Legacy fixed-package support (deprecated) ────────────────────────────────

export interface CreditPackage {
  id: string;
  name: string;
  minutes: number;
  priceOre: number;
  displayPrice: string;
  popular?: boolean;
}

/** @deprecated Fixed packages replaced by flexible per-minute purchasing. */
export const creditPackages: CreditPackage[] = [];

/** @deprecated Use getCreditRateForTier and per-minute pricing instead. */
export const getCreditPackageById = (_id: string): CreditPackage | undefined => undefined;

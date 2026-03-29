// Credit/minute packages available for purchase (add-ons for subscribers only).
// Pricing in NOK (øre for Stripe). Free-tier users cannot purchase credits.
//
// Board directive (2026-03-29): credits priced at 2.5–3.5 NOK/min depending on
// the subscriber's plan tier. These packages use 3.0 NOK/min as a mid-range
// default; the actual charge may be adjusted per-tier in the checkout flow.
//
// Final pricing subject to CFO review (TOL-129).

export interface CreditPackage {
  id: string;
  name: string;
  minutes: number;      // minutes of translation time
  priceOre: number;     // price in NOK øre (1 NOK = 100 øre)
  displayPrice: string; // human-readable NOK price
  popular?: boolean;
}

export const creditPackages: CreditPackage[] = [
  {
    id: 'minutes_15',
    name: '15 minutter',
    minutes: 15,
    priceOre: 4900, // 49 NOK
    displayPrice: '49 kr',
  },
  {
    id: 'minutes_60',
    name: '1 time',
    minutes: 60,
    priceOre: 17900, // 179 NOK
    displayPrice: '179 kr',
    popular: true,
  },
  {
    id: 'minutes_180',
    name: '3 timer',
    minutes: 180,
    priceOre: 49900, // 499 NOK
    displayPrice: '499 kr',
  },
  {
    id: 'minutes_600',
    name: '10 timer',
    minutes: 600,
    priceOre: 149900, // 1 499 NOK
    displayPrice: '1 499 kr',
  },
];

export const getCreditPackageById = (id: string): CreditPackage | undefined => {
  return creditPackages.find((pkg) => pkg.id === id);
};

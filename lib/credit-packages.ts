// Credit/minute add-on packages available for purchase (subscribers only).
// Pricing in NOK øre for Stripe (1 NOK = 100 øre). Free-tier users cannot purchase credits.
//
// CEO-approved pricing (2026-03-29, TOL-128):
//   Ekstra 50:  50 min,  175 NOK (3.50 NOK/min)
//   Ekstra 200: 200 min, 549 NOK (2.75 NOK/min)
//   Ekstra 600: 600 min, 1 490 NOK (2.48 NOK/min)

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
    id: 'ekstra_50',
    name: 'Ekstra 50',
    minutes: 50,
    priceOre: 17500, // 175 NOK
    displayPrice: '175 kr',
  },
  {
    id: 'ekstra_200',
    name: 'Ekstra 200',
    minutes: 200,
    priceOre: 54900, // 549 NOK
    displayPrice: '549 kr',
    popular: true,
  },
  {
    id: 'ekstra_600',
    name: 'Ekstra 600',
    minutes: 600,
    priceOre: 149000, // 1 490 NOK
    displayPrice: '1 490 kr',
  },
];

export const getCreditPackageById = (id: string): CreditPackage | undefined => {
  return creditPackages.find((pkg) => pkg.id === id);
};

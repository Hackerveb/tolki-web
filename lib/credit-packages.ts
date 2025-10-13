// Credit packages available for purchase
// This file can be safely imported by both client and server components
// Packages match exactly with React Native app (TolKI/src/screens/BuyCreditsScreen.tsx)

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in USD cents
  displayPrice: string;
  popular?: boolean;
}

export const creditPackages: CreditPackage[] = [
  {
    id: 'credits_30',
    name: 'Starter',
    credits: 30,
    price: 599, // $5.99
    displayPrice: '$5.99',
  },
  {
    id: 'credits_60',
    name: 'Basic',
    credits: 60,
    price: 1099, // $10.99
    displayPrice: '$10.99',
    popular: true, // Best value - matches ⭐ in React Native
  },
  {
    id: 'credits_360',
    name: 'Standard',
    credits: 360,
    price: 5999, // $59.99
    displayPrice: '$59.99',
  },
  {
    id: 'credits_720',
    name: 'Premium',
    credits: 720,
    price: 11499, // $114.99
    displayPrice: '$114.99',
  },
  {
    id: 'credits_1440',
    name: 'Ultimate',
    credits: 1440,
    price: 21999, // $219.99
    displayPrice: '$219.99',
  },
];

export const getCreditPackageById = (id: string): CreditPackage | undefined => {
  return creditPackages.find((pkg) => pkg.id === id);
};

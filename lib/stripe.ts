import Stripe from 'stripe';

// Re-export credit packages for API routes that need both Stripe client and packages
export { creditPackages, getCreditPackageById, type CreditPackage } from './credit-packages';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

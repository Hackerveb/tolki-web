#!/usr/bin/env node
/**
 * create-stripe-products.js
 *
 * Creates TolKI subscription products and prices in Stripe, then prints the
 * environment variable block you need to add to .env.local (or Vercel settings).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products.js
 *
 * Run once per environment (test / live). Idempotent: if a product with the
 * same name already exists it will be reused.
 */

const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌  STRIPE_SECRET_KEY env var is required');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-10-29.clover' });

// NOK prices in øre (1 NOK = 100 øre)
const PLANS = [
  {
    name: 'TolKI Starter',
    monthlyNok: 990,
    annualNok: 9_900,      // 825/mo effective  (~17% off)
    envPrefix: 'STARTER',
  },
  {
    name: 'TolKI Professional',
    monthlyNok: 2_490,
    annualNok: 24_900,     // 2,075/mo effective (~17% off)
    envPrefix: 'PROFESSIONAL',
  },
  {
    name: 'TolKI Business',
    monthlyNok: 5_990,
    annualNok: 59_900,     // 4,992/mo effective (~17% off)
    envPrefix: 'BUSINESS',
  },
];

async function findOrCreateProduct(name) {
  const existing = await stripe.products.list({ limit: 100 });
  const found = existing.data.find((p) => p.name === name && p.active);
  if (found) {
    console.log(`  ♻️  Reusing existing product: ${name} (${found.id})`);
    return found.id;
  }
  const product = await stripe.products.create({ name });
  console.log(`  ✅ Created product: ${name} (${product.id})`);
  return product.id;
}

async function findOrCreatePrice(productId, unitAmount, interval, nickname) {
  const existing = await stripe.prices.list({ product: productId, limit: 100 });
  const found = existing.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === 'nok' &&
      p.recurring?.interval === interval &&
      p.active
  );
  if (found) {
    console.log(`  ♻️  Reusing existing price: ${nickname} (${found.id})`);
    return found.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'nok',
    recurring: { interval },
    nickname,
  });
  console.log(`  ✅ Created price: ${nickname} (${price.id})`);
  return price.id;
}

async function main() {
  console.log('\n🚀 Creating TolKI subscription products in Stripe...\n');

  const envLines = [];

  for (const plan of PLANS) {
    console.log(`\n📦 ${plan.name}`);
    const productId = await findOrCreateProduct(plan.name);

    const monthlyPriceId = await findOrCreatePrice(
      productId,
      plan.monthlyNok * 100,  // øre
      'month',
      `${plan.name} – Monthly`
    );

    const annualPriceId = await findOrCreatePrice(
      productId,
      plan.annualNok * 100,   // øre
      'year',
      `${plan.name} – Annual`
    );

    envLines.push(`STRIPE_PRICE_${plan.envPrefix}_MONTHLY=${monthlyPriceId}`);
    envLines.push(`STRIPE_PRICE_${plan.envPrefix}_ANNUAL=${annualPriceId}`);
  }

  console.log('\n\n✅ Done! Add these to your .env.local and Vercel environment variables:\n');
  console.log('# ── Stripe Subscription Prices ──────────────────────────────────────────────');
  for (const line of envLines) {
    console.log(line);
  }
  console.log('# ─────────────────────────────────────────────────────────────────────────────\n');
  console.log(
    '⚠️  Also update your Stripe webhook endpoint to listen for:\n' +
    '   customer.subscription.created\n' +
    '   customer.subscription.updated\n' +
    '   customer.subscription.deleted\n' +
    '   invoice.payment_succeeded\n' +
    '   invoice.payment_failed\n'
  );
}

main().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});

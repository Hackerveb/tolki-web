# TolKI Web App - Vercel Deployment Guide

## Overview

TolKI is a Next.js 15 web app with Clerk auth, Convex real-time DB, LiveKit voice translation, and Stripe payments. This guide covers everything needed to deploy on Vercel.

## Prerequisites

- Vercel account with a project created
- Accounts on: Clerk, Convex, LiveKit Cloud, Stripe
- All services configured for production (live keys, not test keys)
- Custom domain (optional but recommended)

---

## Step 1: Environment Variables

Go to **Vercel > Project Settings > Environment Variables** and add each variable below. See `.env.example` for detailed descriptions.

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk publishable key (`pk_live_...`) |
| `CLERK_SECRET_KEY` | Secret | Clerk secret key (`sk_live_...`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | Set to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | Set to `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Public | Set to `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Public | Set to `/` |
| `NEXT_PUBLIC_CONVEX_URL` | Public | Convex deployment URL (`https://xxx.convex.cloud`) |
| `CONVEX_DEPLOY_KEY` | Secret | Convex deploy key (for server-side mutations) |
| `NEXT_PUBLIC_LIVEKIT_URL` | Public | LiveKit WebSocket URL (`wss://xxx.livekit.cloud`) |
| `LIVEKIT_API_KEY` | Secret | LiveKit API key (`API...`) |
| `LIVEKIT_API_SECRET` | Secret | LiveKit API secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe publishable key (`pk_live_...`) |
| `STRIPE_SECRET_KEY` | Secret | Stripe secret/restricted key |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_URL` | Public | Your deployed URL (`https://your-domain.com`) |

**Important:**
- `NEXT_PUBLIC_URL` must exactly match your deployment URL (including `https://`). This controls Stripe checkout redirect URLs.
- Use **live** Stripe keys for production, not test keys.
- Add variables to **all environments** (Production, Preview, Development) or scope as needed.

---

## Step 2: Stripe Webhook

Stripe needs a webhook to notify your app when payments complete.

1. Go to **Stripe Dashboard > Developers > Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. After creating, reveal the **Signing secret** (`whsec_...`)
6. Set this as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Step 3: Clerk Configuration

1. In **Clerk Dashboard > Domains**, add your production domain
2. Under **Paths**, verify sign-in/sign-up URLs match `/sign-in` and `/sign-up`
3. Under **Authentication > Social connections**, ensure Google/Apple OAuth callbacks include your domain
4. If using Convex with Clerk, ensure your Convex deployment has the Clerk issuer URL configured

---

## Step 4: Convex Setup

1. In **Convex Dashboard**, ensure your production deployment is active
2. Verify the deploy key matches `CONVEX_DEPLOY_KEY`
3. If using Clerk auth with Convex, configure the Clerk JWKS endpoint in Convex auth settings:
   - Issuer: `https://your-clerk-domain.clerk.accounts.dev`

---

## Step 5: LiveKit Agent

The voice translation agent must be running and reachable from LiveKit Cloud.

1. Ensure the LiveKit agent is deployed and registered with LiveKit Cloud
2. The agent name must be `Translator` (this is hardcoded in the token generation)
3. Verify the agent's LiveKit project matches the `LIVEKIT_API_KEY`

---

## Step 6: Deploy

1. Connect your GitHub repo to Vercel (or use Vercel CLI)
2. **Build command**: `next build` (Vercel auto-detects Next.js)
3. **Output directory**: `.next` (default)
4. **Node.js version**: 20.x (recommended)
5. Trigger a deployment

The build has been validated and produces no errors. Expected build output:
- 15 routes (12 static, 3 dynamic API routes)
- Middleware (Clerk auth protection)
- ~102 kB shared JS bundle

---

## Step 7: Post-Deploy Verification

### Authentication
- [ ] Sign up with email works
- [ ] Google OAuth sign-in works
- [ ] Protected routes redirect to sign-in
- [ ] `/api/stripe/webhook` is accessible without auth (verified by Stripe signature instead)

### Payments
- [ ] Credit purchase flow completes (Stripe Checkout redirects correctly)
- [ ] Webhook receives events (check Stripe Dashboard > Webhooks > Recent events)
- [ ] Credits appear in user account after purchase
- [ ] No duplicate credit additions on webhook retry

### Voice Translation
- [ ] Microphone permission prompt appears
- [ ] LiveKit connection establishes successfully
- [ ] Translation agent responds
- [ ] Credits deduct during active session

### General
- [ ] All pages load without console errors
- [ ] Mobile layout renders correctly
- [ ] Dark/light mode toggle works

---

## Pre-Deploy Security Checklist

### Headers (configured in next.config.ts)
- [x] `X-Frame-Options: DENY` - prevents clickjacking
- [x] `X-Content-Type-Options: nosniff` - prevents MIME sniffing
- [x] `Referrer-Policy: strict-origin-when-cross-origin` - limits referrer data
- [x] `Permissions-Policy` - disables camera, geolocation, FLoC
- [x] `Strict-Transport-Security` - enforces HTTPS (2-year max-age with preload)
- [x] `X-Powered-By` header removed (`poweredBy: false`)

### Authentication & Authorization
- [x] Clerk middleware protects all routes except public ones
- [x] API routes verify `auth()` and check `userId === clerkId`
- [x] Stripe webhook uses signature verification (not auth)
- [ ] **BLOCKING: Convex mutations lack auth checks** - see TOL-53. `addCredits`, `deductCredits`, `deleteUserAccount`, and `simulatePurchase` are callable by any authenticated client without ownership verification. **Must fix before production.**

### API Route Security
- [x] LiveKit token route: auth + userId match + language validation + key format validation
- [x] Stripe checkout route: auth + userId match + package validation
- [x] Stripe webhook route: signature verification + idempotency check (duplicate session detection)

### Data Exposure
- [ ] **BLOCKING: `users.list` and `payments.getAllPurchases`** expose all data with no auth. These are admin-only queries that should be removed or gated. See TOL-53.

### Secrets
- [x] `.env` files gitignored (`.env*` pattern)
- [x] No secrets in committed code
- [x] Webhook handler does not log secrets (fixed in security hardening commit)
- [ ] Rotate all keys before go-live if they were ever exposed in git history

---

## Troubleshooting

### Stripe redirects to localhost
`NEXT_PUBLIC_URL` is not set or doesn't match the deployed URL. Update it in Vercel and redeploy.

### Webhook not receiving events
1. Verify endpoint URL matches exactly: `https://your-domain.com/api/stripe/webhook`
2. Check Stripe Dashboard > Webhooks for delivery failures
3. Verify `STRIPE_WEBHOOK_SECRET` is set correctly

### LiveKit connection fails
1. Check browser console for errors
2. Ensure microphone permission is granted
3. Verify `NEXT_PUBLIC_LIVEKIT_URL` starts with `wss://`
4. Confirm the translation agent is running

### Clerk auth errors
1. Ensure `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are for the same Clerk app
2. Add your production domain in Clerk Dashboard > Domains
3. Check that OAuth redirect URLs include your domain

### Build Warnings
The build produces two unused-variable warnings (LanguageDropdown.tsx, RecordButton.tsx). These are cosmetic and do not affect functionality.

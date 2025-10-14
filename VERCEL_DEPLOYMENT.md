# Vercel Deployment Guide

This guide will help you properly configure your Vercel deployment to fix the connection and payment issues.

## Issues Fixed

1. **LiveKit Connection Error**: Microphone permission is now requested explicitly before connecting
2. **Stripe Payment Error**: Environment variable name corrected and proper fallback added

## Required Steps for Vercel Deployment

### 1. Update Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and ensure these are set:

#### Required Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-convex-app.convex.cloud
CONVEX_DEPLOY_KEY=your_convex_deploy_key

# LiveKit
# IMPORTANT: Use LIVEKIT_URL (not NEXT_PUBLIC_LIVEKIT_URL)
# Server-side only - not exposed to client, read at runtime
LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Stripe (PRODUCTION KEYS - NOT TEST KEYS!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # You'll get this in step 2
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App URL (CRITICAL - Set this to your actual Vercel URL!)
NEXT_PUBLIC_URL=https://your-app.vercel.app
```

**Important Notes:**
- Replace `your-app.vercel.app` with your actual Vercel deployment URL
- Use LIVE Stripe keys for production, not test keys
- The `NEXT_PUBLIC_URL` must match your actual deployed URL

### 2. Configure Stripe Webhook

The Stripe webhook needs to point to your Vercel deployment:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/stripe/webhook
   ```
   (Replace `your-app.vercel.app` with your actual Vercel URL)

5. Select events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`

6. Click **Add endpoint**

7. Click on the newly created endpoint and reveal the **Signing secret**

8. Copy the signing secret (starts with `whsec_...`)

9. Go back to Vercel → Environment Variables and update:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_new_secret
   ```

### 3. Redeploy Your Application

After updating the environment variables:

1. Go to your Vercel project
2. Navigate to the **Deployments** tab
3. Click the three dots on your latest deployment
4. Click **Redeploy**
5. Wait for the deployment to complete

### 4. Test the Fixes

#### Test LiveKit Connection:
1. Open your production URL in a browser
2. Click the translate button
3. You should see a microphone permission prompt
4. Allow microphone access
5. The connection should now succeed

#### Test Stripe Payments:
1. Go to Settings → Credits
2. Select a credit package
3. Click "Buy Now"
4. Complete the Stripe checkout (use a test card if in test mode)
5. You should be redirected back to your app with credits added

## Troubleshooting

### LiveKit Connection Still Failing

If you still get connection errors:

1. Check browser console for error messages
2. Ensure microphone permission is granted in browser settings
3. Try in an incognito/private window to rule out cached permissions
4. Verify your LiveKit credentials are correct in Vercel

### Stripe Payments Still Not Working

If payments still fail:

1. Check that `NEXT_PUBLIC_URL` exactly matches your Vercel URL (including https://)
2. Verify the Stripe webhook endpoint URL is correct
3. Check Stripe webhook logs in the dashboard for errors
4. Ensure you're using LIVE keys for production (not test keys)
5. Check your Vercel function logs for errors:
   - Go to Vercel → Your Project → Logs
   - Look for `/api/stripe/checkout` and `/api/stripe/webhook` requests

### Common Issues

**Issue**: "Microphone permission denied" error
- **Solution**: The browser might have previously denied permission. Go to browser settings → Site settings → Camera/Microphone and reset permissions for your domain.

**Issue**: Stripe redirects to localhost instead of production
- **Solution**: Double-check that `NEXT_PUBLIC_URL` is set correctly in Vercel (not just in `.env.local`)

**Issue**: Webhook not receiving events
- **Solution**: Make sure the webhook URL in Stripe dashboard exactly matches your Vercel URL, including `https://`

## Verification Checklist

- [ ] All environment variables set in Vercel
- [ ] `NEXT_PUBLIC_URL` set to actual Vercel URL (https://your-app.vercel.app)
- [ ] Stripe webhook created and pointing to correct URL
- [ ] `STRIPE_WEBHOOK_SECRET` updated with signing secret from Stripe
- [ ] Application redeployed after environment variable changes
- [ ] LiveKit connection tested and working
- [ ] Stripe payment tested and credits added successfully

## Need More Help?

If you continue to experience issues:

1. Check Vercel function logs (Vercel Dashboard → Logs)
2. Check browser console for client-side errors
3. Check Stripe webhook logs for delivery issues
4. Ensure all API keys are for the correct environment (production vs test)

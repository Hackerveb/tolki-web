import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/onboarding(.*)',
  '/sign-up(.*)',
  '/forgot-password(.*)',
  '/sso-callback(.*)',
  '/api/stripe/webhook(.*)', // Stripe webhooks must be public (they use signature verification instead)
  '/api/webhooks/clerk(.*)', // Clerk webhooks must be public (svix signature verification)
  '/manifest.json',          // PWA manifest must be accessible without auth
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

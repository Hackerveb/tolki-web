import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe, getCreditPackageById } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { packageId, clerkId } = body;

    // Verify the authenticated user matches the requested user
    if (userId !== clerkId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get credit package
    const creditPackage = getCreditPackageById(packageId);
    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    // Get the origin for redirect URLs
    // Use the request origin first, then NEXT_PUBLIC_URL env var
    // Vercel automatically provides VERCEL_URL as a fallback
    const origin = request.headers.get('origin')
      || process.env.NEXT_PUBLIC_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creditPackage.name} - ${creditPackage.credits} Credits`,
              description: `${creditPackage.credits} credits for TolKI translation service`,
              images: ['https://tolki.app/icon.png'], // Update with your actual icon URL
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/settings/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/credits?canceled=true`,
      client_reference_id: clerkId,
      metadata: {
        clerkId,
        packageId,
        credits: creditPackage.credits.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

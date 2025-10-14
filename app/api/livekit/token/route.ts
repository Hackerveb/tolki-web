import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

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
    const { clerkId, language1, language2 } = body;

    // Verify the authenticated user matches the requested user
    if (userId !== clerkId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!language1 || !language2) {
      return NextResponse.json(
        { error: 'Missing language1 or language2' },
        { status: 400 }
      );
    }

    // Get LiveKit credentials from environment
    // IMPORTANT: Use LIVEKIT_URL (not NEXT_PUBLIC_LIVEKIT_URL) to keep it server-side only
    // This prevents the URL from being embedded in the client bundle at build time
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create room name (unique per user session)
    const roomName = `translation-${clerkId}-${Date.now()}`;

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: clerkId,
      name: clerkId, // You could use user's display name here
      ttl: '1h', // Token valid for 1 hour
    });

    // Grant permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Add metadata for translation settings
    token.metadata = JSON.stringify({
      language1,
      language2,
    });

    // IMPORTANT: Configure the room to connect to the "Translator" agent
    // This is the key configuration that connects to your LiveKit agent
    token.roomConfig = new RoomConfiguration({
      agents: [{
        agentName: 'Translator', // Must match your LiveKit agent name
      }],
    });

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: wsUrl,
      roomName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

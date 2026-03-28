import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';
import { languages } from '@/lib/languages';

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

    // Validate language names against supported languages
    const validLanguageNames = languages.map(l => l.name);
    if (!validLanguageNames.includes(language1) || !validLanguageNames.includes(language2)) {
      return NextResponse.json(
        { error: 'Invalid language specified' },
        { status: 400 }
      );
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;


    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate API key format: must start with "API" followed by at least 8 alphanumeric chars
    if (!/^API[a-zA-Z0-9]{8,}$/.test(apiKey)) {
      console.error('[LiveKit Token Error] Invalid API key format');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate URL format
    if (!wsUrl.startsWith('wss://')) {
      console.error('[LiveKit Token Error] Invalid LiveKit URL format');
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
      ttl: '15m', // Token valid for 15 minutes; sessions can request new tokens as needed
    });

    // Grant permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // IMPORTANT: Configure the room with metadata and agent
    // Room metadata is available immediately when agent connects (before participant joins)
    // This fixes the race condition where first message was missed
    token.roomConfig = new RoomConfiguration({
      metadata: JSON.stringify({
        language1,
        language2,
      }),
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

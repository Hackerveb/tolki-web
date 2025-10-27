'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Room, RoomEvent, ConnectionState } from 'livekit-client';
import { useUser } from '@clerk/nextjs';

interface UseLiveKitRoomReturn {
  room: Room | null;
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  connect: (language1: string, language2: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useLiveKitRoom = (): UseLiveKitRoomReturn => {
  const { user } = useUser();
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<Error | null>(null);

  // Create room instance once
  // EXACT COPY from working example (examples/iphone_demo_sdk/components/app.tsx:22)
  // Bare Room with NO configuration - this is audio-only, video config causes issues
  const room = useMemo(() => new Room(), []);

  // Track connection state changes
  useEffect(() => {
    const handleConnectionStateChange = (state: ConnectionState) => {
      console.log('LiveKit connection state changed:', state);
      setConnectionState(state);
    };

    // CRITICAL: Listen for media device errors (from example app.tsx:32-36)
    // This catches microphone permission denials and device errors
    const handleMediaDevicesError = (error: Error) => {
      console.error('Media device error:', error.name, error.message);
      setError(new Error(`Media device error: ${error.name} - ${error.message}`));
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
    room.on(RoomEvent.MediaDevicesError, handleMediaDevicesError);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
      room.off(RoomEvent.MediaDevicesError, handleMediaDevicesError);
    };
  }, [room]);

  // Handle disconnection on unmount
  useEffect(() => {
    return () => {
      if (room.state === ConnectionState.Connected) {
        room.disconnect();
      }
    };
  }, [room]);

  const connect = useCallback(async (language1: string, language2: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setError(null);

    try {
      // Fetch LiveKit token with language metadata
      console.log('Fetching LiveKit token...');
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          language1,
          language2,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[LiveKit Client] Token fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || 'Failed to get LiveKit token');
      }

      const { token, url } = await response.json();
      console.log('[LiveKit Client] Token received:', {
        url,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...',
      });

      // EXACT PATTERN from working example (examples/iphone_demo_sdk/components/app.tsx:49-55)
      // This is the KEY fix that makes it work on Vercel:
      // 1. No manual getUserMedia permission request (LiveKit handles it automatically)
      // 2. preConnectBuffer: true buffers audio before connection completes
      // 3. Promise.all executes both operations in parallel (faster + more reliable)
      console.log('Connecting to LiveKit room...');
      await Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: true,
        }),
        room.connect(url, token),
      ]);

      console.log('Successfully connected to LiveKit room and enabled microphone');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to LiveKit');
      console.error('[LiveKit Client] Connection error:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        roomState: room.state,
      });
      setError(error);
      throw error;
    }
  }, [room, user]);

  const disconnect = useCallback(async () => {
    try {
      await room.disconnect();
      console.log('Disconnected from LiveKit room');
    } catch (err) {
      console.error('Error disconnecting from LiveKit:', err);
    }
  }, [room]);

  const isConnecting = connectionState === ConnectionState.Connecting;
  const isConnected = connectionState === ConnectionState.Connected;

  return {
    room,
    connectionState,
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
  };
};

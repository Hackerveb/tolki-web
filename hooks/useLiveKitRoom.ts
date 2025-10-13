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
  const room = useMemo(() => new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: {
        width: 1280,
        height: 720,
        frameRate: 30,
      },
    },
  }), []);

  // Track connection state changes
  useEffect(() => {
    const handleConnectionStateChange = (state: ConnectionState) => {
      console.log('LiveKit connection state changed:', state);
      setConnectionState(state);
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
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
      // Get LiveKit token from API
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
        throw new Error(errorData.error || 'Failed to get LiveKit token');
      }

      const { token, url } = await response.json();

      // Enable microphone and connect in parallel (following the example pattern)
      // preConnectBuffer allows audio to be buffered before the connection completes
      await Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: true,
        }),
        room.connect(url, token),
      ]);

      console.log('Successfully connected to LiveKit room and enabled microphone');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to LiveKit');
      console.error('LiveKit connection error:', error);
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

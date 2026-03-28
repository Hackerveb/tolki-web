'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RecordingState } from '@/types';

const FFT_SIZE = 64;
const BIN_COUNT = FFT_SIZE / 2; // 32 bins

/**
 * Analyzes audio from the local microphone (listening) or remote agent (translating).
 * Returns a Uint8Array of frequency magnitudes [0..255] for each FFT bin.
 */
export const useAudioVisualizer = (
  room: Room | null,
  state: RecordingState,
): Uint8Array => {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(() => new Uint8Array(BIN_COUNT).fill(0));

  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(BIN_COUNT).fill(0) as Uint8Array<ArrayBuffer>);

  const isActive = state === 'listening' || state === 'thinking' || state === 'translating';

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close().catch(() => {});
    }
    sourceRef.current = null;
    analyserRef.current = null;
    contextRef.current = null;
    setFrequencyData(new Uint8Array(BIN_COUNT).fill(0));
  }, []);

  useEffect(() => {
    if (!room || !isActive) {
      teardown();
      return;
    }

    const getTrack = () => {
      // For translating: try remote (agent) audio first
      if (state === 'translating') {
        const remote = Array.from(room.remoteParticipants.values())[0];
        if (remote) {
          const pub = Array.from(remote.audioTrackPublications.values())[0];
          const mediaTrack = pub?.track?.mediaStreamTrack;
          if (mediaTrack) return mediaTrack;
        }
      }
      // Default: local mic
      const localPub = Array.from(room.localParticipant.audioTrackPublications.values())[0];
      return localPub?.track?.mediaStreamTrack ?? null;
    };

    const setup = () => {
      teardown();

      const mediaTrack = getTrack();
      if (!mediaTrack) return;

      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(new MediaStream([mediaTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.75;
        analyser.minDecibels = -85;
        analyser.maxDecibels = -20;
        source.connect(analyser);

        contextRef.current = ctx;
        sourceRef.current = source;
        analyserRef.current = analyser;

        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataRef.current);
          setFrequencyData(new Uint8Array(dataRef.current));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // AudioContext may fail in SSR or restricted environments — fail silently
      }
    };

    setup();

    // Re-setup when tracks change
    const onTrackChange = () => setup();
    room.on(RoomEvent.TrackSubscribed, onTrackChange);
    room.on(RoomEvent.TrackUnsubscribed, onTrackChange);
    room.on(RoomEvent.LocalTrackPublished, onTrackChange);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackChange);
      room.off(RoomEvent.TrackUnsubscribed, onTrackChange);
      room.off(RoomEvent.LocalTrackPublished, onTrackChange);
      teardown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, isActive, state]);

  return frequencyData;
};

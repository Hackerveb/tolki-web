'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { Language, RecordingState } from '@/types';
import { defaultSourceLanguage, defaultTargetLanguage } from '@/lib/languages';
import { LanguageDropdown } from '@/components/LanguageDropdown';
import { RecordButton } from '@/components/RecordButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import { useTrackUsage } from '@/hooks/useTrackUsage';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function MainScreen() {
  const router = useRouter();
  const { credits, isLoaded, isSignedIn } = useCurrentUser();
  const [sourceLanguage, setSourceLanguage] = useState<Language>(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(defaultTargetLanguage);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');

  // LiveKit integration
  const { room, connect, disconnect, isConnected, error } = useLiveKitRoom();

  // Usage tracking
  const { secondsUsed, reset: resetUsage } = useTrackUsage({
    isActive: recordingState === 'recording',
    onInsufficientCredits: () => {
      // Stop recording if credits run out
      handleRecordingStateChange('idle');
      alert('You have run out of credits. Please purchase more to continue using the translation service.');
    },
  });

  // Redirect to onboarding if not signed in
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/onboarding');
    }
  }, [isLoaded, isSignedIn, router]);

  // Smart language selection handlers
  const handleSourceLanguageSelect = (language: Language) => {
    setSourceLanguage(language);
    // If selected language is same as target, swap them
    if (language.code === targetLanguage.code) {
      setTargetLanguage(sourceLanguage);
    }
  };

  const handleTargetLanguageSelect = (language: Language) => {
    setTargetLanguage(language);
    // If selected language is same as source, swap them
    if (language.code === sourceLanguage.code) {
      setSourceLanguage(targetLanguage);
    }
  };

  const handleRecordingStateChange = async (state: RecordingState) => {
    setRecordingState(state);
    console.log('Recording state changed:', state);

    if (state === 'connecting') {
      // Start connecting to LiveKit
      try {
        await connect(sourceLanguage.name, targetLanguage.name);
        // Once connected, RecordButton will auto-transition to 'recording' state
      } catch (err) {
        console.error('Failed to connect to LiveKit:', err);
        setRecordingState('idle');
        // Show the actual error message for debugging
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        alert(`Failed to connect to translation service.\n\nError: ${errorMessage}\n\nPlease check your microphone permissions and try again.`);
      }
    } else if (state === 'idle') {
      // Disconnect from LiveKit
      await disconnect();
      // Reset usage tracking
      resetUsage();
    }
  };

  // Sync recording state with LiveKit connection state
  useEffect(() => {
    if (isConnected && recordingState === 'connecting') {
      setRecordingState('recording');
    }
  }, [isConnected, recordingState]);

  const getStatusText = () => {
    if (error) {
      return 'Connection failed - Please try again';
    }
    switch (recordingState) {
      case 'connecting':
        return 'Connecting to translator...';
      case 'recording':
        return 'Listening & Translating';
      default:
        return 'Tap to start translating';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (recordingState) {
      case 'connecting':
        return colors.connectingBlue;
      case 'recording':
        return colors.recordingRed;
      default:
        return colors.muted;
    }
  };

  const balance = credits || 0;
  const isLowOnCredits = balance > 0 && balance < 5;

  if (!isLoaded || !isSignedIn) {
    return (
      <div
        className="h-screen flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: colors.muted }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room || undefined}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />
      <div
        className="h-screen flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
      {/* Header */}
      <header
        className="flex items-center"
        style={{
          gap: '15px',
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          paddingBottom: '24px',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
        }}
      >
        {/* Source Language */}
        <LanguageDropdown
          selectedLanguage={sourceLanguage}
          onLanguageSelect={handleSourceLanguageSelect}
          dropDirection="down"
          className="flex-1"
        />

        {/* Separator Dot */}
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.silver }}
        />

        {/* Target Language */}
        <LanguageDropdown
          selectedLanguage={targetLanguage}
          onLanguageSelect={handleTargetLanguageSelect}
          dropDirection="down"
          className="flex-1"
        />

        {/* Settings Button */}
        <motion.div
          whileTap={{ rotate: 90, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            href="/settings"
            prefetch={true}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
            style={{
              backgroundColor: colors.background,
              boxShadow: shadows.subtle.boxShadow,
              display: 'flex',
            }}
          >
            <SettingsIcon />
          </Link>
        </motion.div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col items-center justify-center py-5 relative"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
        }}
      >
        {/* Credit Display */}
        <div className="absolute top-5 flex flex-col items-center">
          <div className="font-bold" style={{ fontSize: '32px', color: colors.primary }}>
            {balance.toFixed(0)}
            <span className="font-bold" style={{ fontSize: '32px', color: colors.silverAlpha(0.6) }}>
              /{(balance / 60).toFixed(1)}hr
            </span>
          </div>
          <div className="text-xs mt-1" style={{ color: colors.silverAlpha(0.6) }}>
            remaining
          </div>
          {recordingState === 'recording' && (
            <div className="text-xs italic mt-0.5" style={{ color: colors.blueMunsell }}>
              Using ~1 credit/minute
            </div>
          )}
          {recordingState === 'idle' && balance > 0 && balance < 0.05 && (
            <div className="text-[11px] mt-0.5" style={{ color: '#FFA500' }}>
              Minimum charge: 0.05 credits
            </div>
          )}
          {isLowOnCredits && recordingState === 'idle' && (
            <Link
              href="/settings/credits"
              prefetch={true}
              className="mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: colors.primaryAlpha(0.1),
                color: colors.primary,
              }}
            >
              Buy more credits →
            </Link>
          )}
        </div>

        {/* Record Button */}
        <div className="my-auto">
          <RecordButton
            onStateChange={handleRecordingStateChange}
            disabled={balance < 0.05}
          />
        </div>

        {/* Status Text */}
        <div className="mt-12 min-h-[24px] flex items-center justify-center">
          <p
            className="text-sm font-medium"
            style={{ color: getStatusColor() }}
          >
            {getStatusText()}
          </p>
        </div>

        {/* Timer Display - Separate with fade animation */}
        <motion.div
          className="mt-10 min-h-[30px] flex items-center justify-center"
          animate={{ opacity: recordingState === 'recording' ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="text-2xl font-medium"
            style={{
              color: colors.blueMunsell,
              fontFeatureSettings: '"tnum"',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(secondsUsed)}
          </div>
        </motion.div>

        {/* Warning if insufficient credits */}
        {balance < 0.05 && (
          <div className="mt-8 px-4 py-3 rounded-xl text-center max-w-xs" style={{ backgroundColor: colors.primaryAlpha(0.1) }}>
            <p className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>
              Insufficient Credits
            </p>
            <p className="text-xs mb-3" style={{ color: colors.muted }}>
              You need at least 0.05 credits to start a session (minimum charge).
            </p>
            <Link
              href="/settings/credits"
              prefetch={true}
              className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: colors.primary,
                color: colors.white,
              }}
            >
              Buy Credits
            </Link>
          </div>
        )}
      </main>
    </div>
    </RoomContext.Provider>
  );
}

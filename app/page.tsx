'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { Language, RecordingState } from '@/types';
import { defaultSourceLanguage, defaultTargetLanguage } from '@/lib/languages';
import { LanguageDropdown } from '@/components/LanguageDropdown';
import { RecordButton } from '@/components/RecordButton';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import { useTrackUsage } from '@/hooks/useTrackUsage';
import { useToast } from '@/hooks/useToast';
import { useAgentMode } from '@/hooks/useAgentMode';
import { languageStorage } from '@/utils/languageStorage';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

// Moved outside component to prevent recreation on every render
const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

type ConnectionStatus = 'idle' | 'connecting' | 'connected';

export default function MainScreen() {
  const router = useRouter();
  const { credits, isLoaded, isSignedIn } = useCurrentUser();
  const [sourceLanguage, setSourceLanguage] = useState<Language>(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(defaultTargetLanguage);

  // Local connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  const { toast } = useToast();

  // LiveKit integration
  const { room, connect, disconnect, isConnected, error } = useLiveKitRoom();

  // Agent Mode (Listening/Thinking/Speaking)
  const agentMode = useAgentMode(room);

  // Derived RecordingState for UI
  const currentRecordingState: RecordingState =
    connectionStatus === 'idle' ? 'idle' :
      connectionStatus === 'connecting' ? 'connecting' :
        agentMode; // When connected, use the agent mode

  // Usage tracking
  const { secondsUsed, reset: resetUsage } = useTrackUsage({
    isActive: connectionStatus === 'connected',
    onInsufficientCredits: () => {
      // Stop recording if credits run out
      handleRecordingStateChange('idle');
      toast.error('You have run out of credits. Please purchase more to continue using the translation service.');
    },
  });

  // Redirect to onboarding if not signed in
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/onboarding');
    }
  }, [isLoaded, isSignedIn, router]);

  // Smart language selection handlers - memoized to prevent child re-renders
  const handleSourceLanguageSelect = useCallback((language: Language) => {
    setSourceLanguage(language);
    // If selected language is same as target, swap them
    setTargetLanguage((currentTarget) => {
      if (language.code === currentTarget.code) {
        setSourceLanguage((currentSource) => {
          languageStorage.saveLanguagePair(language, currentSource);
          return language;
        });
        return sourceLanguage;
      }
      languageStorage.saveLanguagePair(language, currentTarget);
      return currentTarget;
    });
  }, [sourceLanguage]);

  const handleTargetLanguageSelect = useCallback((language: Language) => {
    setTargetLanguage(language);
    // If selected language is same as source, swap them
    setSourceLanguage((currentSource) => {
      if (language.code === currentSource.code) {
        setTargetLanguage((currentTarget) => {
          languageStorage.saveLanguagePair(currentTarget, language);
          return language;
        });
        return targetLanguage;
      }
      languageStorage.saveLanguagePair(currentSource, language);
      return currentSource;
    });
  }, [targetLanguage]);

  const handleRecordingStateChange = useCallback(async (newState: RecordingState) => {
    // Map UI state changes back to connection logic
    if (newState === 'connecting') {
      setConnectionStatus('connecting');
      console.log('Starting connection...');

      try {
        await connect(sourceLanguage.name, targetLanguage.name);
        // Connection successful - state will update via useEffect below
      } catch (err) {
        console.error('Failed to connect to LiveKit:', err);
        setConnectionStatus('idle');
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to connect: ${errorMessage}. Please check your microphone permissions.`, 6000);
      }
    } else if (newState === 'idle') {
      setConnectionStatus('idle');
      console.log('Disconnecting...');
      await disconnect();
      resetUsage();
    }
  }, [connect, disconnect, resetUsage, sourceLanguage.name, targetLanguage.name, toast]);

  // Sync connection status with LiveKit
  useEffect(() => {
    if (isConnected && connectionStatus === 'connecting') {
      setConnectionStatus('connected');
    }
  }, [isConnected, connectionStatus]);

  const getStatusText = () => {
    if (error) {
      return 'Connection failed - Please try again';
    }
    switch (currentRecordingState) {
      case 'connecting':
        return 'Connecting to translator...';
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'translating':
        return 'Translating...';
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
    switch (currentRecordingState) {
      case 'connecting':
        return colors.connectingBlue;
      case 'listening':
        return colors.success;
      case 'thinking':
        return colors.warning;
      case 'translating':
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  // Format credits display: show minutes if under 1 hour, otherwise hours
  const formatCreditsDisplay = (credits: number): string => {
    if (credits < 60) {
      return `${credits.toFixed(0)} min`;
    } else {
      return `${(credits / 60).toFixed(1)} hrs`;
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
        <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6">
          <SkeletonLoader variant="rectangle" width="100%" height="60px" />
          <SkeletonLoader variant="circle" width="120px" height="120px" />
          <SkeletonLoader variant="text" width="150px" height="20px" />
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
              aria-label="Settings"
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
          className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            paddingLeft: 'max(20px, env(safe-area-inset-left))',
            paddingRight: 'max(20px, env(safe-area-inset-right))',
          }}
        >
          {/* Credit Display */}
          <div className="absolute top-5 flex flex-col items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="font-bold" style={{ fontSize: '32px', color: colors.primary, lineHeight: '1' }}>
                {formatCreditsDisplay(balance)}
              </div>
              <div className="text-xs font-medium" style={{ color: colors.silverAlpha(0.6) }}>
                {balance.toFixed(0)} credits remaining
              </div>
            </div>
            {connectionStatus === 'connected' && (
              <div className="text-xs italic mt-2" style={{ color: colors.blueMunsell }}>
                Using ~1 credit/minute
              </div>
            )}
            {connectionStatus === 'idle' && balance > 0 && balance < 0.05 && (
              <div className="text-[11px] mt-1" style={{ color: colors.warning }}>
                Minimum charge: 0.05 credits
              </div>
            )}
            {isLowOnCredits && connectionStatus === 'idle' && (
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
              state={currentRecordingState}
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
            className="mt-6 min-h-[30px] flex items-center justify-center"
            animate={{ opacity: connectionStatus === 'connected' ? 1 : 0 }}
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

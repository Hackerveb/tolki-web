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
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Settings icon component
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

type ConnectionStatus = 'idle' | 'connecting' | 'connected';

function MainScreenInner() {
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
    setSourceLanguage((prevSource) => {
      setTargetLanguage((prevTarget) => {
        // If selected source is same as current target, swap them
        const newTarget = language.code === prevTarget.code ? prevSource : prevTarget;
        languageStorage.saveLanguagePair(language, newTarget);
        return newTarget;
      });
      return language;
    });
  }, []);

  const handleTargetLanguageSelect = useCallback((language: Language) => {
    setTargetLanguage((prevTarget) => {
      setSourceLanguage((prevSource) => {
        // If selected target is same as current source, swap them
        const newSource = language.code === prevSource.code ? prevTarget : prevSource;
        languageStorage.saveLanguagePair(newSource, language);
        return newSource;
      });
      return language;
    });
  }, []);

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
        return 'Processing...';
      case 'translating':
        return 'Speaking...';
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
        return colors.connecting;
      case 'listening':
        return colors.listening;
      case 'thinking':
        return colors.thinking;
      case 'translating':
        return colors.translating;
      default:
        return 'var(--color-text-tertiary)';
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
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6">
          <SkeletonLoader variant="rectangle" width="100%" height="60px" />
          <SkeletonLoader variant="circle" width="100px" height="100px" />
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
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* Header */}
        <header
          className="flex items-center gap-3"
          style={{
            paddingTop: 'max(20px, env(safe-area-inset-top))',
            paddingBottom: '16px',
            paddingLeft: 'max(20px, env(safe-area-inset-left))',
            paddingRight: 'max(20px, env(safe-area-inset-right))',
          }}
        >
          {/* Source Language */}
          <LanguageDropdown
            selectedLanguage={sourceLanguage}
            onLanguageSelect={handleSourceLanguageSelect}
            dropDirection="down"
            className="flex-1"
          />

          {/* Separator */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5 12h14M12 5l7 7-7 7" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Target Language */}
          <LanguageDropdown
            selectedLanguage={targetLanguage}
            onLanguageSelect={handleTargetLanguageSelect}
            dropDirection="down"
            className="flex-1"
          />

          {/* Settings Button */}
          <Link
            href="/settings"
            prefetch={true}
            aria-label="Settings"
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-[var(--color-neutral-100)]"
            style={{
              color: 'var(--color-text-secondary)',
            }}
          >
            <SettingsIcon />
          </Link>
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
          <div className="absolute top-4 flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {formatCreditsDisplay(balance)}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                remaining
              </span>
            </div>
            {connectionStatus === 'connected' && (
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                ~1 credit/minute
              </div>
            )}
            {isLowOnCredits && connectionStatus === 'idle' && (
              <Link
                href="/settings/credits"
                prefetch={true}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                style={{
                  backgroundColor: colors.primaryAlpha(0.1),
                  color: colors.primary,
                }}
              >
                Buy more credits
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
          <div className="mt-8 min-h-[24px] flex items-center justify-center">
            <p
              className="text-sm font-medium"
              style={{ color: getStatusColor() }}
            >
              {getStatusText()}
            </p>
          </div>

          {/* Timer Display */}
          <motion.div
            className="mt-4 min-h-[28px] flex items-center justify-center"
            animate={{ opacity: connectionStatus === 'connected' ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="text-xl font-medium"
              style={{
                color: 'var(--color-text-secondary)',
                fontFeatureSettings: '"tnum"',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatTime(secondsUsed)}
            </div>
          </motion.div>

          {/* Warning if insufficient credits */}
          {balance < 0.05 && (
            <div
              className="mt-8 px-5 py-4 rounded-xl text-center max-w-xs"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Insufficient Credits
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                You need at least 0.05 credits to start a session.
              </p>
              <Link
                href="/settings/credits"
                prefetch={true}
                className="inline-block px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: colors.primary,
                  color: 'var(--color-on-primary)',
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

export default function MainScreen() {
  return (
    <ErrorBoundary>
      <MainScreenInner />
    </ErrorBoundary>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio, useVoiceAssistant } from '@livekit/components-react';
import { Language } from '@/types';
import { defaultSourceLanguage, defaultTargetLanguage } from '@/lib/languages';
import { LanguageDropdown } from '@/components/LanguageDropdown';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { AgentAudioVisualizerWave } from '@/components/AgentAudioVisualizerWave';
import { AgentChatTranscript } from '@/components/AgentChatTranscript';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import { useTrackUsage } from '@/hooks/useTrackUsage';
import { useToast } from '@/hooks/useToast';
import { languageStorage } from '@/utils/languageStorage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const MicIcon = ({ muted }: { muted: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    )}
  </svg>
);

const HOLD_TO_MUTE_KEY = 'tolki_hold_mute_educated';
type ConnectionStatus = 'idle' | 'connecting' | 'connected';

// Inner component — needs to live inside RoomContext.Provider
function MainScreenContent() {
  const router = useRouter();
  const { credits, isLoaded, isSignedIn } = useCurrentUser();
  const [sourceLanguage, setSourceLanguage] = useState<Language>(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(defaultTargetLanguage);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [showMuteHint, setShowMuteHint] = useState(false);
  const [settingsRotation, setSettingsRotation] = useState(0);
  const muteHintTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { toast } = useToast();
  const { room, connect, disconnect, isConnected, error } = useLiveKitRoom();
  const { state: agentState, audioTrack } = useVoiceAssistant();

  const { secondsUsed, reset: resetUsage } = useTrackUsage({
    isActive: connectionStatus === 'connected',
    onInsufficientCredits: () => {
      handleRecordingStop();
      toast.error('You have run out of credits. Please purchase more to continue.');
    },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/onboarding');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isConnected && connectionStatus === 'connecting') {
      setConnectionStatus('connected');
      const hasSeen = typeof window !== 'undefined' && localStorage.getItem(HOLD_TO_MUTE_KEY);
      if (!hasSeen) {
        setShowMuteHint(true);
        muteHintTimerRef.current = setTimeout(() => {
          setShowMuteHint(false);
          localStorage.setItem(HOLD_TO_MUTE_KEY, '1');
        }, 4000);
      }
    }
  }, [isConnected, connectionStatus]);

  useEffect(() => {
    return () => { if (muteHintTimerRef.current) clearTimeout(muteHintTimerRef.current); };
  }, []);

  useEffect(() => {
    if (connectionStatus === 'idle' && isMuted) setIsMuted(false);
  }, [connectionStatus, isMuted]);

  const handleSourceLanguageSelect = useCallback((language: Language) => {
    setSourceLanguage((prevSource) => {
      setTargetLanguage((prevTarget) => {
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
        const newSource = language.code === prevSource.code ? prevTarget : prevSource;
        languageStorage.saveLanguagePair(newSource, language);
        return newSource;
      });
      return language;
    });
  }, []);

  const handleStartSession = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      await connect(sourceLanguage.name, targetLanguage.name);
    } catch (err) {
      setConnectionStatus('idle');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to connect: ${msg}. Check microphone permissions.`, 6000);
    }
  }, [connect, sourceLanguage.name, targetLanguage.name, toast]);

  const handleRecordingStop = useCallback(async () => {
    setConnectionStatus('idle');
    await disconnect();
    resetUsage();
  }, [disconnect, resetUsage]);

  const handleVisualizerClick = useCallback(() => {
    if (connectionStatus === 'connecting') return;
    if (connectionStatus === 'connected') handleRecordingStop();
    else if (!isInsufficientCredits) handleStartSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, handleRecordingStop, handleStartSession]);

  const handleMuteStart = useCallback(() => {
    if (!room) return;
    setIsMuted(true);
    room.localParticipant.setMicrophoneEnabled(false).catch(console.error);
    if (showMuteHint) {
      setShowMuteHint(false);
      if (muteHintTimerRef.current) clearTimeout(muteHintTimerRef.current);
      localStorage.setItem(HOLD_TO_MUTE_KEY, '1');
    }
  }, [room, showMuteHint]);

  const handleMuteEnd = useCallback(() => {
    if (!room) return;
    setIsMuted(false);
    room.localParticipant.setMicrophoneEnabled(true).catch(console.error);
  }, [room]);

  const handleSettingsClick = useCallback(() => {
    setSettingsRotation((r) => r + 360);
  }, []);

  const formatCreditsDisplay = (c: number) => {
    if (c < 1) return `${Math.round(c * 60)}s`;
    if (c < 60) return `${Math.round(c)} min`;
    const hrs = c / 60;
    return hrs >= 10 ? `${Math.round(hrs)}h` : `${hrs.toFixed(1)}h`;
  };

  const balance = credits || 0;
  const isLowOnCredits = balance > 0 && balance < 5;
  const isInsufficientCredits = balance < 0.05;

  // The primary CTA text — doubles as a tappable action label
  const ctaText = (() => {
    if (connectionStatus === 'connected') return 'Tap to stop session. Hold to pause microphone';
    if (connectionStatus === 'connecting') return 'Connecting…';
    if (error) return 'Connection failed — try again';
    if (isInsufficientCredits) return 'Insufficient credits';
    return 'Tap to start translating';
  })();

  const ctaClickable =
    (connectionStatus === 'idle' && !isInsufficientCredits && !error) ||
    connectionStatus === 'connected';

  const getStatusColor = () => {
    if (connectionStatus === 'idle') return 'var(--color-text-tertiary)';
    switch (agentState) {
      case 'listening':    return 'var(--color-listening)';
      case 'thinking':     return 'var(--color-thinking)';
      case 'speaking':     return 'var(--color-translating)';
      case 'connecting':
      case 'initializing': return 'var(--color-connecting)';
      default:             return 'var(--color-text-secondary)';
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="glass-page h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6">
          <SkeletonLoader variant="rectangle" width="100%" height="60px" />
          <SkeletonLoader variant="circle" width="100px" height="100px" />
          <SkeletonLoader variant="text" width="150px" height="20px" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-page h-screen flex flex-col overflow-hidden">
      {/* ── Glass header ─────────────────────────────────────────── */}
      <header
        className="glass flex-shrink-0"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: '14px',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          borderRadius: '0 0 24px 24px',
          margin: '0 8px',
          marginTop: 'max(8px, env(safe-area-inset-top))',
        }}
      >
        <div className="flex items-center gap-3">
          <LanguageDropdown
            selectedLanguage={sourceLanguage}
            onLanguageSelect={handleSourceLanguageSelect}
            dropDirection="down"
            className="flex-1"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5 12h14M12 5l7 7-7 7" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <LanguageDropdown
            selectedLanguage={targetLanguage}
            onLanguageSelect={handleTargetLanguageSelect}
            dropDirection="down"
            className="flex-1"
          />
          <Link
            href="/settings"
            prefetch={true}
            aria-label="Settings"
            onClick={handleSettingsClick}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--glass-bg-subtle)',
              backdropFilter: 'var(--glass-blur-sm)',
              WebkitBackdropFilter: 'var(--glass-blur-sm)',
              border: '1px solid var(--glass-border-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: settingsRotation }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </motion.svg>
          </Link>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col items-center overflow-hidden"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Credits — plain text, no container */}
        <div className="flex items-center gap-3 mt-5 mb-1 flex-shrink-0">
          <span
            className="text-base font-semibold tracking-tight"
            style={{
              color: isLowOnCredits ? 'var(--color-error)' : 'var(--color-text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCreditsDisplay(balance)} left
          </span>
          {isLowOnCredits && connectionStatus === 'idle' && (
            <Link
              href="/settings/credits"
              prefetch
              className="text-xs font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              Top up →
            </Link>
          )}
        </div>

        {/* Visualizer + CTA section */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">

          {/* AgentAudioVisualizerWave — centerpiece, clickable */}
          <motion.div
            animate={{
              scale: connectionStatus === 'connected' ? 1.02 : 1,
              opacity: isInsufficientCredits ? 0.4 : 1,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <AgentAudioVisualizerWave
              state={agentState}
              audioTrack={audioTrack}
              size="lg"
              color="#1FD5F9"
              blur={4}
              lineWidth={3}
              colorShift={0.4}
              onClick={connectionStatus !== 'connecting' ? handleVisualizerClick : undefined}
              aria-label={connectionStatus === 'connected' ? 'Stop translation session' : 'Start translation session'}
            />
          </motion.div>

          {/* CTA text — animated, clickable when relevant */}
          <div className="mt-5 relative flex items-center justify-center" style={{ minHeight: '44px' }}>
            <AnimatePresence mode="wait">
              <motion.button
                key={ctaText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={ctaClickable ? (connectionStatus === 'connected' ? handleRecordingStop : handleStartSession) : undefined}
                aria-live="polite"
                className="text-[14px] font-medium tracking-wide text-center"
                style={{
                  color: getStatusColor(),
                  letterSpacing: '0.02em',
                  cursor: ctaClickable ? 'pointer' : 'default',
                  background: 'none',
                  border: 'none',
                  padding: '0 4px',
                  maxWidth: '260px',
                  lineHeight: '1.5',
                }}
              >
                {ctaText}
              </motion.button>
            </AnimatePresence>
          </div>

          {/* Session timer */}
          <AnimatePresence>
            {connectionStatus === 'connected' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 text-2xl font-light tracking-tight"
                style={{
                  color: 'var(--color-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum"',
                  letterSpacing: '-0.02em',
                }}
              >
                {`${Math.floor(secondsUsed / 60)}:${(secondsUsed % 60).toString().padStart(2, '0')}`}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Hold-to-mute button */}
          <AnimatePresence>
            {connectionStatus === 'connected' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="mt-5 flex flex-col items-center gap-2"
              >
                <motion.button
                  onPointerDown={handleMuteStart}
                  onPointerUp={handleMuteEnd}
                  onPointerLeave={handleMuteEnd}
                  aria-label={isMuted ? 'Unmute (release to speak)' : 'Hold to mute'}
                  aria-pressed={isMuted}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isMuted
                      ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                      : 'var(--glass-bg-strong)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    border: `1px solid ${isMuted ? 'rgba(220,38,38,0.4)' : 'var(--glass-border)'}`,
                    boxShadow: isMuted ? '0 4px 20px rgba(220,38,38,0.35)' : 'var(--glass-shadow-sm)',
                    color: isMuted ? '#fff' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'none',
                  }}
                  whileTap={{ scale: 0.94 }}
                >
                  <MicIcon muted={isMuted} />
                </motion.button>

                <AnimatePresence>
                  {showMuteHint && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-xs text-center"
                      style={{ color: 'var(--color-text-tertiary)', maxWidth: '160px', lineHeight: '1.5' }}
                    >
                      Hold the mic button to mute yourself
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Insufficient credits notice */}
          {isInsufficientCredits && (
            <div className="glass mt-6 px-6 py-5 rounded-2xl text-center" style={{ maxWidth: '280px' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Insufficient Credits
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)', lineHeight: '1.5' }}>
                You need at least 0.05 credits to start a session.
              </p>
              <Link
                href="/settings/credits"
                prefetch
                className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
              >
                Buy Credits
              </Link>
            </div>
          )}
        </div>

        {/* Live transcript */}
        <AnimatePresence>
          {connectionStatus === 'connected' && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-sm mt-2 flex-shrink-0"
            >
              <AgentChatTranscript style={{ maxHeight: '150px' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MainScreenInner() {
  const { room } = useLiveKitRoom();

  return (
    <RoomContext.Provider value={room || undefined}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />
      <MainScreenContent />
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

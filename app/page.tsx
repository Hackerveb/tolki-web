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
import { AgentAudioVisualizerWave } from '@/components/agent-audio-visualizer-wave';
import { AgentChatTranscript } from '@/components/AgentChatTranscript';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import { useTrackUsage } from '@/hooks/useTrackUsage';
import { useToast } from '@/hooks/useToast';
import { useLocale } from '@/hooks/useLocale';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/lib/i18n';
import { languageStorage } from '@/utils/languageStorage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const HOLD_TO_MUTE_KEY = 'tolki_hold_mute_educated';
type ConnectionStatus = 'idle' | 'connecting' | 'connected';

// Agent states that indicate the agent has truly joined and is ready/active
const AGENT_ACTIVE_STATES = new Set(['listening', 'thinking', 'speaking']);

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
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const agentTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const isHoldingRef = useRef(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { locale } = useLocale();
  const { resolvedTheme } = useTheme();
  const tt = useT(locale);
  const { room, connect, disconnect, isConnected, error } = useLiveKitRoom();
  const { state: agentState, audioTrack } = useVoiceAssistant();

  const { secondsUsed, reset: resetUsage } = useTrackUsage({
    isActive: connectionStatus === 'connected',
    onInsufficientCredits: () => {
      handleRecordingStop();
      toast.error(tt('main.outOfCredits'));
    },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/onboarding');
  }, [isLoaded, isSignedIn, router]);

  // Force mobile Safari to repaint gradient background on theme change
  useEffect(() => {
    const el = pageRef.current;
    if (el) {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--glass-page-bg');
      el.style.background = bg;
    }
  }, [resolvedTheme]);

  // When room connects, start waiting for agent to join (timeout 12s)
  useEffect(() => {
    if (isConnected && connectionStatus === 'connecting') {
      // Don't immediately go to 'connected' — wait for agent to join
      agentTimeoutRef.current = setTimeout(() => {
        // Agent never joined — disconnect and show error
        setConnectionStatus('idle');
        disconnect();
        resetUsage();
        toast.error(tt('main.noAgent'), 8000);
      }, 12000);
    }
    return () => {
      if (agentTimeoutRef.current) clearTimeout(agentTimeoutRef.current);
    };
  }, [isConnected, connectionStatus, disconnect, resetUsage, toast]);

  // When agent actually joins and is active (listening/thinking/speaking), mark as connected
  useEffect(() => {
    if (connectionStatus === 'connecting' && isConnected && AGENT_ACTIVE_STATES.has(agentState)) {
      // Agent has truly joined and is active — clear timeout, show connected
      if (agentTimeoutRef.current) clearTimeout(agentTimeoutRef.current);
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
  }, [agentState, connectionStatus, isConnected]);

  // If agent dispatch fails, disconnect and show error
  useEffect(() => {
    if (connectionStatus === 'connecting' && agentState === 'failed') {
      if (agentTimeoutRef.current) clearTimeout(agentTimeoutRef.current);
      setConnectionStatus('idle');
      disconnect();
      resetUsage();
      toast.error(tt('main.agentFailed'), 8000);
    }
  }, [agentState, connectionStatus, disconnect, resetUsage, toast]);

  useEffect(() => {
    return () => {
      if (muteHintTimerRef.current) clearTimeout(muteHintTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (agentTimeoutRef.current) clearTimeout(agentTimeoutRef.current);
    };
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
      toast.error(tt('main.connectFailed', { msg }), 6000);
    }
  }, [connect, sourceLanguage.name, targetLanguage.name, toast]);

  const handleRecordingStop = useCallback(async () => {
    if (agentTimeoutRef.current) clearTimeout(agentTimeoutRef.current);
    setConnectionStatus('idle');
    await disconnect();
    resetUsage();
  }, [disconnect, resetUsage]);

  // Tap vs hold: hold (>500ms) = mute only (keep session), short tap = start/stop
  const handleVisualizerPointerDown = useCallback(() => {
    if (connectionStatus === 'connecting') return;
    isHoldingRef.current = false;

    if (connectionStatus === 'connected') {
      holdTimerRef.current = setTimeout(() => {
        isHoldingRef.current = true;
        if (!room) return;
        setIsMuted(true);
        room.localParticipant.setMicrophoneEnabled(false).catch(console.error);
        if (showMuteHint) {
          setShowMuteHint(false);
          if (muteHintTimerRef.current) clearTimeout(muteHintTimerRef.current);
          localStorage.setItem(HOLD_TO_MUTE_KEY, '1');
        }
      }, 500);
    }
  }, [connectionStatus, room, showMuteHint]);

  const handleVisualizerPointerUp = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    if (isHoldingRef.current) {
      // Was holding — unmute mic, keep session alive
      if (room) {
        setIsMuted(false);
        room.localParticipant.setMicrophoneEnabled(true).catch(console.error);
      }
      // Delay reset so click handler still sees the flag
      setTimeout(() => { isHoldingRef.current = false; }, 50);
    }
  }, [room]);

  const handleVisualizerPointerLeave = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (isHoldingRef.current) {
      if (room) {
        setIsMuted(false);
        room.localParticipant.setMicrophoneEnabled(true).catch(console.error);
      }
      setTimeout(() => { isHoldingRef.current = false; }, 50);
    }
  }, [room]);

  const handleVisualizerClick = useCallback(() => {
    if (connectionStatus === 'connecting') return;
    if (isHoldingRef.current) return; // Was a hold, don't stop session
    if (connectionStatus === 'connected') handleRecordingStop();
    else if (!isInsufficientCredits) handleStartSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, handleRecordingStop, handleStartSession]);

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

  // Map visualizer state: only show active states when truly connected
  const visualizerState = connectionStatus === 'connected'
    ? agentState
    : connectionStatus === 'connecting'
      ? 'connecting'
      : 'disconnected';

  // The primary CTA text — doubles as a tappable action label
  const ctaText = (() => {
    if (connectionStatus === 'connected') return tt('main.tapToStop');
    if (connectionStatus === 'connecting') return tt('main.connecting');
    if (error) return tt('main.connectionFailed');
    if (isInsufficientCredits) return tt('main.insufficientCredits');
    return tt('main.tapToStart');
  })();

  const ctaClickable =
    (connectionStatus === 'idle' && !isInsufficientCredits && !error) ||
    connectionStatus === 'connected';

  const getStatusColor = () => {
    if (connectionStatus === 'idle') return 'var(--color-text-tertiary)';
    switch (visualizerState) {
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
    <div ref={pageRef} className="glass-page h-screen flex flex-col overflow-hidden">
      {/* ── Glass header ─────────────────────────────────────────── */}
      <header
        className="glass flex-shrink-0"
        style={{
          position: 'relative',
          zIndex: 40,
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
            <path d="M5 12h14M19 12l-4-4M19 12l-4 4M5 12l4-4M5 12l4 4" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
        {/* Top spacer — pushes credits to ~25% from top */}
        <div style={{ flex: '1 1 0' }} />

        {/* Credits / remaining time — positioned ~3/4 from bottom */}
        <motion.div
          className="flex flex-col items-center mb-6 flex-shrink-0"
          animate={{ opacity: isInsufficientCredits ? 0.5 : 1 }}
        >
          {/* Always show remaining balance */}
          <motion.div className="flex items-center gap-2">
            {/* Clock icon for time remaining */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke={isLowOnCredits ? 'var(--color-error)' : 'var(--color-text-primary)'} strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" stroke={isLowOnCredits ? 'var(--color-error)' : 'var(--color-text-primary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <motion.span
              className="text-2xl font-light tracking-tight"
              style={{
                color: isLowOnCredits ? 'var(--color-error)' : 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
              animate={isLowOnCredits ? { opacity: [1, 0.5, 1] } : {}}
              transition={isLowOnCredits ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
              {formatCreditsDisplay(balance)} {tt('main.left')}
            </motion.span>
            {isLowOnCredits && connectionStatus === 'idle' && (
              <Link
                href="/subscribe"
                prefetch
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: 'var(--color-primary)' }}
              >
                {/* Upward arrow icon for upgrade */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {tt('main.upgradeNow')}
              </Link>
            )}
          </motion.div>

          {/* Session countdown — smaller font under remaining time */}
          <AnimatePresence>
            {connectionStatus === 'connected' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="text-base font-light tracking-tight mt-1"
                style={{
                  color: 'var(--color-text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {`${Math.floor(secondsUsed / 60)}:${(secondsUsed % 60).toString().padStart(2, '0')}`}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Middle spacer */}
        <div style={{ flex: '1 1 0' }} />

        {/* Visualizer + CTA section */}
        <div className="flex flex-col items-center w-full flex-shrink-0">

          {/* AgentAudioVisualizerWave — centerpiece, tap to start/stop, hold to mute */}
          <motion.div
            animate={{
              scale: connectionStatus === 'connected' ? 1.02 : 1,
              opacity: isInsufficientCredits ? 0.4 : 1,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <AgentAudioVisualizerWave
              state={visualizerState}
              audioTrack={audioTrack}
              size="lg"
              color="#1FD5F9"
              blur={4}
              lineWidth={4}
              colorShift={0.3}
              onClick={connectionStatus !== 'connecting' ? handleVisualizerClick : undefined}
              onPointerDown={handleVisualizerPointerDown}
              onPointerUp={handleVisualizerPointerUp}
              onPointerLeave={handleVisualizerPointerLeave}
              aria-label={connectionStatus === 'connected' ? 'Tap to stop. Hold to mute.' : 'Start translation session'}
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

          {/* Mute indicator — shown when holding visualizer */}
          <AnimatePresence>
            {isMuted && connectionStatus === 'connected' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-2 flex items-center gap-1.5"
              >
                {/* Mic-off icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <line x1="1" y1="1" x2="23" y2="23" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 16.95A7 7 0 0 1 5 12m14 0a7 7 0 0 1-.11 1.23" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="19" x2="12" y2="23" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>
                  {tt('main.micMuted')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Insufficient credits notice */}
          {isInsufficientCredits && (
            <Link href="/subscribe" prefetch className="block mt-6" style={{ maxWidth: '300px' }}>
              <div
                className="glass px-6 py-5 rounded-2xl text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  border: '1px solid var(--color-primary)',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(79,70,229,0.04))',
                }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {tt('main.outOfCredits')}
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)', lineHeight: '1.5' }}>
                  {tt('main.needCredits')}
                </p>
                <span
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                    color: '#fff',
                    boxShadow: 'var(--glass-glow-primary)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tt('main.upgradeNow')}
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* Bottom spacer */}
        <div style={{ flex: '2 1 0' }} />

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

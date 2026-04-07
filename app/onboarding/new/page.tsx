'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, CreateOrganization } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '@/convex/_generated/api';
import { languages, defaultSourceLanguage, defaultTargetLanguage, displayName } from '@/lib/languages';
import { languageStorage } from '@/utils/languageStorage';
import { colors } from '@/styles/colors';
import type { Language } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const transition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 28 : 8,
            backgroundColor: i === current ? colors.primary : 'var(--color-neutral-300)',
            boxShadow: i === current ? `0 0 8px ${colors.primary}60` : 'none',
          }}
          transition={{ duration: 0.25 }}
          style={{ height: 8, borderRadius: 4 }}
        />
      ))}
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled = false,
  loading = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full font-semibold transition-all"
      style={{
        background: disabled || loading
          ? 'var(--color-neutral-300)'
          : `linear-gradient(135deg, ${colors.primary}, #4F46E5)`,
        color: disabled || loading ? 'var(--color-text-tertiary)' : '#FFFFFF',
        opacity: disabled || loading ? 0.6 : 1,
        minHeight: 52,
        borderRadius: 14,
        fontSize: 16,
        boxShadow: !disabled && !loading ? '0 4px 20px rgba(37,99,235,0.3)' : 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        border: 'none',
      }}
      aria-busy={loading}
    >
      {loading ? 'Saving...' : children}
    </button>
  );
}

function LanguagePicker({
  label,
  selected,
  onSelect,
  exclude,
}: {
  label: string;
  selected: Language;
  onSelect: (lang: Language) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = languages.filter(
    (l) => l.code !== exclude && l.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between transition-all glass"
        style={{
          borderRadius: 14,
          padding: '14px 16px',
          cursor: 'pointer',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected.name}`}
      >
        <span style={{ fontSize: 15, color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {displayName(selected)}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            {/* Backdrop */}
            <div
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={() => { setOpen(false); setSearch(''); }}
              aria-hidden="true"
            />
            {/* Glass Sheet */}
            <div
              className="glass-strong"
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: '70vh',
                borderRadius: '24px 24px 0 0',
                padding: '16px 0 0',
                display: 'flex',
                flexDirection: 'column',
              }}
              role="listbox"
              aria-label={label}
            >
              <div style={{ padding: '0 16px 12px' }}>
                <p className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)', textAlign: 'center' }}>
                  {label}
                </p>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search language..."
                  className="w-full glass-input"
                  style={{
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: 15,
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                  aria-label="Search languages"
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                {filtered.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { onSelect(lang); setOpen(false); setSearch(''); }}
                    role="option"
                    aria-selected={lang.code === selected.code}
                    className="w-full flex items-center gap-3 transition-all"
                    style={{
                      padding: '12px 16px',
                      backgroundColor: lang.code === selected.code ? 'var(--color-primary-alpha)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 15, color: 'var(--color-text-primary)', flex: 1 }}>{displayName(lang)}</span>
                    {lang.code === selected.code && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepAccountType({ onSelect, onBack }: {
  onSelect: (type: 'personal' | 'org') => void;
  onBack: () => void;
}) {
  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div className="text-center mb-8">
        <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🧭</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          How will you use TolKI?
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Choose how you&apos;d like to get started.
        </p>
      </div>

      <div className="flex flex-col gap-4" style={{ marginBottom: 32 }}>
        {/* Personal option */}
        <button
          onClick={() => onSelect('personal')}
          className="glass text-left transition-all active:scale-[0.98]"
          style={{ padding: '20px', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, border: 'none' }}
          aria-label="Personal use"
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${colors.primary}, #4F46E5)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            👤
          </div>
          <div style={{ flex: 1 }}>
            <p className="font-semibold mb-1" style={{ fontSize: 16, color: 'var(--color-text-primary)' }}>
              Personal Use
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
              I want to use TolKI for myself
            </p>
            <span
              style={{
                fontSize: 12,
                color: colors.primary,
                fontWeight: 500,
                background: `${colors.primary}18`,
                padding: '3px 10px',
                borderRadius: 99,
                display: 'inline-block',
              }}
            >
              20 free minutes/month
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Organisation option */}
        <button
          onClick={() => onSelect('org')}
          className="glass text-left transition-all active:scale-[0.98]"
          style={{ padding: '20px', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, border: 'none' }}
          aria-label="Organisation use"
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${colors.success}, #059669)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            🏢
          </div>
          <div style={{ flex: 1 }}>
            <p className="font-semibold mb-1" style={{ fontSize: 16, color: 'var(--color-text-primary)' }}>
              For My Organisation
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
              I want to set up TolKI for my team or business
            </p>
            <span
              style={{
                fontSize: 12,
                color: colors.success,
                fontWeight: 500,
                background: `${colors.success}18`,
                padding: '3px 10px',
                borderRadius: 99,
                display: 'inline-block',
              }}
            >
              Team collaboration
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <button
        onClick={onBack}
        className="font-medium transition-all glass"
        style={{ minHeight: 52, width: 52, borderRadius: 14, fontSize: 20, cursor: 'pointer', border: 'none' }}
        aria-label="Go back"
      >
        ←
      </button>
    </div>
  );
}

function StepCreateOrg({ onBeforeCreate, onSkip, onBack, loading }: {
  onBeforeCreate: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await onBeforeCreate();
      setShowForm(true);
    } catch {
      setIsSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <div style={{ padding: '24px 24px 32px' }}>
        <div className="text-center mb-6">
          <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🏢</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Create your organisation
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Set up your team workspace in TolKI.
          </p>
        </div>

        <div
          className="glass"
          style={{ borderRadius: 20, padding: 16, marginBottom: 16, overflow: 'hidden' }}
        >
          <CreateOrganization
            afterCreateOrganizationUrl="/subscribe"
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: {
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                },
              },
            }}
          />
        </div>

        <button
          onClick={onSkip}
          className="w-full font-medium transition-all"
          style={{
            minHeight: 44,
            borderRadius: 12,
            fontSize: 15,
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            background: 'transparent',
            border: 'none',
          }}
        >
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div className="text-center mb-8">
        <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🏢</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Set up your organisation
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Create a team workspace and invite colleagues to TolKI.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="glass"
        style={{ borderRadius: 20, padding: '16px 20px', marginBottom: 28 }}
      >
        {[
          { icon: '👥', text: 'Invite your team members' },
          { icon: '📊', text: 'Shared usage dashboard' },
          { icon: '💳', text: 'Centralised billing for your team' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }} aria-hidden="true">{icon}</span>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{text}</span>
          </div>
        ))}
      </motion.div>

      <div className="flex gap-3" style={{ marginBottom: 12 }}>
        <button
          onClick={onBack}
          className="flex-shrink-0 font-medium transition-all glass"
          style={{ minHeight: 52, width: 52, borderRadius: 14, fontSize: 20, cursor: 'pointer', border: 'none' }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <PrimaryButton onClick={handleCreate} loading={isSubmitting || loading}>
            Create Organisation
          </PrimaryButton>
        </div>
      </div>

      <button
        onClick={onSkip}
        className="w-full font-medium transition-all"
        style={{
          minHeight: 44,
          borderRadius: 12,
          fontSize: 15,
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          background: 'transparent',
          border: 'none',
        }}
      >
        Skip for now
      </button>
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ padding: '32px 24px' }}>
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ marginBottom: 32 }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${colors.primary}, #4F46E5)`,
            boxShadow: `0 16px 40px ${colors.primary}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
              fill="white"
            />
            <circle cx="8" cy="5" r="1.5" fill="white" opacity="0.7" />
            <circle cx="16" cy="5" r="1.5" fill="white" opacity="0.7" />
          </svg>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Welcome to TolKI
        </h1>
        <p className="text-base" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Real-time voice translation in 58 languages. Speak — and be heard in any language, instantly.
        </p>
      </motion.div>

      {/* Animated Feature Pills */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex flex-wrap justify-center gap-2"
        style={{ marginTop: 28, marginBottom: 40 }}
      >
        {['🎙️ Voice-first', '⚡ Real-time', '🌍 58 languages', '🔒 Private'].map((pill) => (
          <span
            key={pill}
            className="glass-subtle"
            style={{
              borderRadius: 99,
              padding: '6px 14px',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
            }}
          >
            {pill}
          </span>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.55 }}
        style={{ width: '100%' }}
      >
        <PrimaryButton onClick={onNext}>Get Started →</PrimaryButton>
      </motion.div>
    </div>
  );
}

function StepLanguages({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
  onNext,
  onBack,
}: {
  sourceLanguage: Language;
  targetLanguage: Language;
  onSourceChange: (l: Language) => void;
  onTargetChange: (l: Language) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = sourceLanguage.code !== targetLanguage.code;

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div className="text-center mb-8">
        <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🌐</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Choose your languages
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Set your default translation pair. You can always change this later.
        </p>
      </div>

      <div className="flex flex-col gap-4" style={{ marginBottom: 32 }}>
        <LanguagePicker
          label="I speak"
          selected={sourceLanguage}
          onSelect={onSourceChange}
          exclude={targetLanguage.code}
        />

        {/* Swap indicator */}
        <div className="flex items-center justify-center">
          <div
            className="glass"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <LanguagePicker
          label="I want to translate to"
          selected={targetLanguage}
          onSelect={onTargetChange}
          exclude={sourceLanguage.code}
        />
      </div>

      {!canContinue && (
        <p className="text-xs text-center mb-4" style={{ color: colors.error }}>
          Source and target languages must be different.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-shrink-0 font-medium transition-all glass"
          style={{
            minHeight: 52,
            width: 52,
            borderRadius: 14,
            fontSize: 20,
            cursor: 'pointer',
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <PrimaryButton onClick={onNext} disabled={!canContinue}>
            Continue
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function StepMicTest({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!canvas || !analyser || !dataArray) return;

    animFrameRef.current = requestAnimationFrame(drawWaveform);

    analyser.getByteTimeDomainData(dataArray);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Compute RMS for level indicator
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const norm = (dataArray[i] - 128) / 128;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    setAudioLevel(Math.min(rms * 4, 1));

    // Draw waveform
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = colors.primary;
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  const requestMic = async () => {
    setPermissionState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext not supported');

      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      setPermissionState('granted');
      drawWaveform();
    } catch {
      setPermissionState('denied');
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div className="text-center mb-6">
        <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🎙️</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Test your microphone
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          TolKI needs your microphone to translate your speech.
        </p>
      </div>

      {/* Glass Waveform Container */}
      <div
        className="glass"
        style={{
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          minHeight: 130,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
        role="img"
        aria-label={permissionState === 'granted' ? 'Audio waveform visualizer' : 'Microphone test area'}
      >
        {permissionState === 'idle' && (
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Tap the button below to test your mic
          </p>
        )}
        {permissionState === 'requesting' && (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Requesting access...
          </p>
        )}
        {permissionState === 'granted' && (
          <>
            <canvas
              ref={canvasRef}
              width={280}
              height={80}
              style={{ width: '100%', height: 80 }}
              aria-hidden="true"
            />
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: 0.8 + audioLevel * 0.5 }}
                transition={{ duration: 0.05 }}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: audioLevel > 0.05 ? colors.success : 'var(--color-neutral-300)',
                  boxShadow: audioLevel > 0.05 ? `0 0 8px ${colors.success}60` : 'none',
                }}
                aria-hidden="true"
              />
              <span className="text-xs" style={{ color: audioLevel > 0.05 ? colors.success : 'var(--color-text-tertiary)', fontWeight: 500 }}>
                {audioLevel > 0.05 ? '🎙️ Mic is working!' : 'Speak to test...'}
              </span>
            </div>
          </>
        )}
        {permissionState === 'denied' && (
          <div className="text-center">
            <p className="text-sm font-medium mb-1" style={{ color: colors.error }}>
              Microphone access denied
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Enable microphone in your browser settings to use TolKI.
            </p>
          </div>
        )}
      </div>

      {permissionState === 'idle' && (
        <button
          onClick={requestMic}
          className="w-full font-medium transition-all mb-4 glass"
          style={{
            minHeight: 48,
            borderRadius: 12,
            fontSize: 15,
            cursor: 'pointer',
            color: colors.primary,
          }}
        >
          Allow Microphone Access
        </button>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-shrink-0 font-medium transition-all glass"
          style={{
            minHeight: 52,
            width: 52,
            borderRadius: 14,
            fontSize: 20,
            cursor: 'pointer',
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <PrimaryButton onClick={onNext} disabled={permissionState === 'requesting'}>
            {permissionState === 'granted' ? 'Continue' : 'Skip for Now'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

const HOW_IT_WORKS_PANELS = [
  {
    icon: '🎙️',
    title: 'Speak',
    description: 'Talk naturally in your language. TolKI listens in real-time.',
    color: colors.success,
  },
  {
    icon: '⚡',
    title: 'AI Translates',
    description: 'Our AI model processes your speech and translates it instantly.',
    color: colors.primary,
  },
  {
    icon: '🔊',
    title: 'Hear It Back',
    description: 'The translation is spoken aloud in the target language.',
    color: colors.warning,
  },
];

function StepHowItWorks({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [activePanel, setActivePanel] = useState(0);

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div className="text-center mb-6">
        <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">✨</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          How it works
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Three simple steps to real-time translation.
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-4">
        {HOW_IT_WORKS_PANELS.map((panel, i) => (
          <button
            key={i}
            onClick={() => setActivePanel(i)}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 12,
              border: 'none',
              background: activePanel === i
                ? `linear-gradient(135deg, ${panel.color}, ${panel.color}CC)`
                : 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: activePanel === i ? 'transparent' : 'var(--glass-border)',
              color: activePanel === i ? 'white' : 'var(--color-text-secondary)',
              fontSize: 22,
              fontWeight: activePanel === i ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activePanel === i ? `0 4px 16px ${panel.color}40` : 'var(--glass-shadow-sm)',
            }}
            aria-selected={activePanel === i}
            aria-label={panel.title}
          >
            {panel.icon}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div
        className="glass"
        style={{
          borderRadius: 20,
          padding: 24,
          minHeight: 120,
          marginBottom: 24,
          overflow: 'hidden',
        }}
        role="tabpanel"
        aria-label={HOW_IT_WORKS_PANELS[activePanel].title}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activePanel}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: `${HOW_IT_WORKS_PANELS[activePanel].color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 12,
              }}
              aria-hidden="true"
            >
              {HOW_IT_WORKS_PANELS[activePanel].icon}
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {HOW_IT_WORKS_PANELS[activePanel].title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {HOW_IT_WORKS_PANELS[activePanel].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-shrink-0 font-medium transition-all glass"
          style={{
            minHeight: 52,
            width: 52,
            borderRadius: 14,
            fontSize: 20,
            cursor: 'pointer',
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function StepFreeCredits({
  onFinish,
  onBack,
  loading,
}: {
  onFinish: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div style={{ padding: '24px 24px 32px' }}>
      <div className="text-center mb-8">
        {/* Animated credit badge */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            display: 'inline-block',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.info})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 16px 40px ${colors.primary}50`,
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, color: 'white', lineHeight: 1 }}>10</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>CREDITS</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            You&apos;re all set! 🎉
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            We&apos;ve gifted you <strong style={{ color: 'var(--color-text-primary)' }}>10 free credits</strong> to get started with TolKI.
          </p>
        </motion.div>
      </div>

      {/* Credit info glass card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
        className="glass"
        style={{
          borderRadius: 20,
          padding: '16px 20px',
          marginBottom: 28,
        }}
      >
        {[
          { icon: '⏱️', text: '1 credit = 1 minute of translation' },
          { icon: '🌍', text: 'Works with all 58 supported languages' },
          { icon: '💳', text: 'Top up credits anytime in Settings' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }} aria-hidden="true">{icon}</span>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{text}</span>
          </div>
        ))}
      </motion.div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-shrink-0 font-medium transition-all glass"
          style={{
            minHeight: 52,
            width: 52,
            borderRadius: 14,
            fontSize: 20,
            cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <PrimaryButton onClick={onFinish} loading={loading}>
            Start Translating 🎙️
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingNewPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [sourceLanguage, setSourceLanguage] = useState<Language>(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(defaultTargetLanguage);
  const [finishing, setFinishing] = useState(false);
  const [accountType, setAccountType] = useState<'personal' | 'org'>('personal');

  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const onboardingDone = useQuery(
    api.users.hasCompletedOnboarding,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  useEffect(() => {
    if (isLoaded && isSignedIn && onboardingDone === true) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, onboardingDone, router]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/onboarding');
    }
  }, [isLoaded, isSignedIn, router]);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleFinish = async () => {
    if (!clerkUser?.id) return;
    setFinishing(true);
    try {
      await completeOnboarding({
        clerkId: clerkUser.id,
        sourceLanguage: sourceLanguage.code,
        targetLanguage: targetLanguage.code,
      });
      languageStorage.saveLanguagePair(sourceLanguage, targetLanguage);
      router.push('/');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setFinishing(false);
    }
  };

  const handleSkip = () => {
    if (clerkUser?.id) {
      completeOnboarding({
        clerkId: clerkUser.id,
        sourceLanguage: sourceLanguage.code,
        targetLanguage: targetLanguage.code,
      }).catch(console.error);
    }
    router.push('/');
  };

  const handleOrgBeforeCreate = async () => {
    if (!clerkUser?.id) return;
    setFinishing(true);
    try {
      await completeOnboarding({
        clerkId: clerkUser.id,
        sourceLanguage: sourceLanguage.code,
        targetLanguage: targetLanguage.code,
      });
      languageStorage.saveLanguagePair(sourceLanguage, targetLanguage);
    } catch (err) {
      console.error('Failed to complete onboarding before org creation:', err);
      setFinishing(false);
      throw err;
    }
  };

  if (!isLoaded || onboardingDone === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center glass-page"
        aria-busy="true"
        aria-label="Loading"
      >
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.primary}, #4F46E5)`,
            boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
          }}
        />
      </div>
    );
  }

  const steps = [
    <StepWelcome key="welcome" onNext={goNext} />,
    <StepAccountType
      key="accountType"
      onSelect={(type) => { setAccountType(type); goNext(); }}
      onBack={goBack}
    />,
    <StepLanguages
      key="languages"
      sourceLanguage={sourceLanguage}
      targetLanguage={targetLanguage}
      onSourceChange={setSourceLanguage}
      onTargetChange={setTargetLanguage}
      onNext={goNext}
      onBack={goBack}
    />,
    <StepMicTest key="mic" onNext={goNext} onBack={goBack} />,
    accountType === 'org'
      ? <StepCreateOrg
          key="createOrg"
          onBeforeCreate={handleOrgBeforeCreate}
          onSkip={goNext}
          onBack={goBack}
          loading={finishing}
        />
      : <StepHowItWorks key="howitworks" onNext={goNext} onBack={goBack} />,
    <StepFreeCredits key="credits" onFinish={handleFinish} onBack={goBack} loading={finishing} />,
  ];

  return (
    <div
      className="min-h-screen flex flex-col glass-page"
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'max(16px, env(safe-area-inset-top)) 16px 8px',
        }}
      >
        <div style={{ width: 60 }} />
        <StepDots current={step} total={TOTAL_STEPS} />
        {step > 0 ? (
          <button
            onClick={handleSkip}
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-tertiary)', minWidth: 60, textAlign: 'right' }}
          >
            Skip
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>

      {/* Step content */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom safe area */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { useVoiceAssistant } from '@livekit/components-react';

interface AgentChatTranscriptProps {
  className?: string;
  style?: React.CSSProperties;
  maxSegments?: number;
}

/**
 * Displays real-time transcription from the connected LiveKit voice agent.
 * Uses useVoiceAssistant() to read agentTranscriptions.
 */
export function AgentChatTranscript({ className, style, maxSegments = 6 }: AgentChatTranscriptProps) {
  const { agentTranscriptions } = useVoiceAssistant();
  const bottomRef = useRef<HTMLDivElement>(null);

  const segments = agentTranscriptions?.slice(-maxSegments) ?? [];

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentTranscriptions]);

  if (segments.length === 0) return null;

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Translation transcript"
      className={`overflow-y-auto ${className ?? ''}`}
      style={{
        maxHeight: '180px',
        scrollbarWidth: 'none',
        ...style,
      }}
    >
      <style>{`.transcript-scrollarea::-webkit-scrollbar { display: none; }`}</style>
      {segments.map((segment, i) => {
        const isFinal = (segment as { final?: boolean }).final !== false;
        const text = (segment as { text: string }).text;
        const id = (segment as { id?: string }).id ?? `seg-${i}`;
        const isLast = i === segments.length - 1;

        return (
          <div
            key={id}
            className={isLast ? 'glass-animate-in' : ''}
            style={{
              padding: '8px 14px',
              marginBottom: '6px',
              borderRadius: '14px',
              background: isFinal
                ? 'var(--glass-bg-strong)'
                : 'var(--glass-bg-subtle)',
              border: `1px solid ${isFinal ? 'var(--glass-border)' : 'var(--glass-border-subtle)'}`,
              opacity: isFinal ? 1 : 0.70,
              transition: 'opacity 0.2s ease-out',
            }}
          >
            <p
              className="text-sm"
              style={{
                color: isFinal ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                lineHeight: '1.5',
                margin: 0,
                fontStyle: isFinal ? 'normal' : 'italic',
              }}
            >
              {text}
            </p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

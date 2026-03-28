'use client';

import React, { memo, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';
import { RecordingState } from '@/types';
import { colors } from '@/styles/colors';

// ---------------------------------------------------------------------------
// Audio Visualizer — SVG bars in a ring around the button
// ---------------------------------------------------------------------------

const NUM_BARS = 24;
const BUTTON_RADIUS = 50;   // half of 100px button
const BAR_GAP = 6;
const BAR_MIN = 3;
const BAR_MAX = 22;
const BAR_WIDTH = 3;
const VIS_CENTER = 90;      // half of 180px SVG container
const INNER_R = BUTTON_RADIUS + BAR_GAP;

interface AudioVisualizerProps {
    frequencyData: Uint8Array;
    state: RecordingState;
    isMuted: boolean;
}

const AudioVisualizer = memo(({ frequencyData, state, isMuted }: AudioVisualizerProps) => {
    const isVisible = state === 'listening' || state === 'thinking' || state === 'translating';
    if (!isVisible) return null;

    const barColor = (() => {
        if (isMuted) return colors.neutral[400];
        switch (state) {
            case 'listening':   return colors.listening;
            case 'thinking':    return colors.thinking;
            case 'translating': return colors.translating;
            default:            return colors.primary;
        }
    })();

    return (
        <svg
            width={VIS_CENTER * 2}
            height={VIS_CENTER * 2}
            className="absolute pointer-events-none"
            style={{ top: -(VIS_CENTER - BUTTON_RADIUS), left: -(VIS_CENTER - BUTTON_RADIUS) }}
            aria-hidden="true"
        >
            {Array.from({ length: NUM_BARS }, (_, i) => {
                const binIdx = Math.floor((i / NUM_BARS) * (frequencyData.length - 1));
                const magnitude = frequencyData[binIdx] / 255;
                const barH = BAR_MIN + magnitude * (BAR_MAX - BAR_MIN);
                const angleDeg = (i / NUM_BARS) * 360 - 90;

                return (
                    <rect
                        key={i}
                        x={-BAR_WIDTH / 2}
                        y={-(INNER_R + barH)}
                        width={BAR_WIDTH}
                        height={barH}
                        rx={BAR_WIDTH / 2}
                        fill={barColor}
                        opacity={isMuted ? 0.3 : 0.65 + magnitude * 0.35}
                        transform={`translate(${VIS_CENTER},${VIS_CENTER}) rotate(${angleDeg})`}
                    />
                );
            })}
        </svg>
    );
});
AudioVisualizer.displayName = 'AudioVisualizer';

// ---------------------------------------------------------------------------
// RecordButton
// ---------------------------------------------------------------------------

interface RecordButtonProps {
    state: RecordingState;
    onStateChange: (state: RecordingState) => void;
    /** Called on pointer-down while connected (hold-to-mute start) */
    onMuteStart?: () => void;
    /** Called on pointer-up while connected (hold-to-mute end) */
    onMuteEnd?: () => void;
    /** Whether the mic is currently muted via hold-to-mute */
    isMuted?: boolean;
    /** Real-time frequency magnitudes [0..255] per bin from Web Audio API */
    frequencyData?: Uint8Array;
    disabled?: boolean;
}

const EMPTY_FREQ = new Uint8Array(32).fill(0);

const RecordButtonComponent: React.FC<RecordButtonProps> = ({
    state,
    onStateChange,
    onMuteStart,
    onMuteEnd,
    isMuted = false,
    frequencyData = EMPTY_FREQ,
    disabled = false,
}) => {
    const isConnected = state === 'listening' || state === 'thinking' || state === 'translating';
    const pointerDownRef = useRef(false);

    // Click — only fires for idle/connecting states
    const handleClick = useCallback(() => {
        if (disabled || isConnected) return;
        onStateChange(state === 'idle' ? 'connecting' : 'idle');
    }, [disabled, isConnected, state, onStateChange]);

    // Hold-to-mute — active only when connected
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (disabled || !isConnected || !onMuteStart) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerDownRef.current = true;
        onMuteStart();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }
    }, [disabled, isConnected, onMuteStart]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!pointerDownRef.current || !onMuteEnd) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        pointerDownRef.current = false;
        onMuteEnd();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    }, [onMuteEnd]);

    const handlePointerCancel = useCallback(() => {
        if (!pointerDownRef.current || !onMuteEnd) return;
        pointerDownRef.current = false;
        onMuteEnd();
    }, [onMuteEnd]);

    // Visual helpers
    const getButtonColor = () => {
        if (isMuted) return colors.neutral[500];
        switch (state) {
            case 'listening':   return colors.listening;
            case 'thinking':    return colors.thinking;
            case 'translating': return colors.translating;
            case 'connecting':  return colors.connecting;
            case 'idle':
            default:            return colors.primary;
        }
    };

    const getPulseColor = () => {
        switch (state) {
            case 'listening':   return 'var(--color-listening-pulse)';
            case 'thinking':    return 'var(--color-thinking-pulse)';
            case 'translating': return 'var(--color-translating-pulse)';
            case 'connecting':
            default:            return 'var(--color-connecting-pulse)';
        }
    };

    const getIconBorderRadius = () =>
        state === 'idle' || state === 'connecting' ? 20 : 8;

    const icon = isMuted || state === 'thinking' || state === 'translating'
        ? <MicOff size={18} color="white" strokeWidth={2} />
        : <Mic size={18} color="white" strokeWidth={2} />;

    const ariaLabel = isMuted
        ? 'Microphone muted — release to unmute'
        : !isConnected
            ? (state === 'idle' ? 'Start translating' : 'Cancel connection')
            : 'Hold to mute microphone';

    return (
        <div className="relative flex items-center justify-center w-[100px] h-[100px]">
            {/* Audio waveform visualizer (expands beyond the 100px hitbox) */}
            <AudioVisualizer frequencyData={frequencyData} state={state} isMuted={isMuted} />

            {/* Connecting pulse ring */}
            {state === 'connecting' && (
                <motion.div
                    className="absolute w-[100px] h-[100px] rounded-full"
                    style={{ border: `2px solid ${getPulseColor()}` }}
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Main button */}
            <motion.button
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-pressed={isMuted || undefined}
                className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-none select-none"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--color-border)',
                }}
                whileHover={{ boxShadow: 'var(--shadow-md)' }}
                whileTap={{ scale: disabled ? 1 : 0.97 }}
                transition={{ duration: 0.15 }}
            >
                <motion.div
                    className="w-9 h-9 relative overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: getButtonColor() }}
                    animate={{
                        backgroundColor: getButtonColor(),
                        borderRadius: getIconBorderRadius(),
                    }}
                    transition={{ duration: 0.2 }}
                >
                    {icon}
                </motion.div>
            </motion.button>
        </div>
    );
};

RecordButtonComponent.displayName = 'RecordButton';

export const RecordButton = memo(RecordButtonComponent);

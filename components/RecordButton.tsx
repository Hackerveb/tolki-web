'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { RecordingState } from '@/types';
import { colors } from '@/styles/colors';

interface RecordButtonProps {
    state: RecordingState;
    onStateChange: (state: RecordingState) => void;
    disabled?: boolean;
}

const RecordButtonComponent: React.FC<RecordButtonProps> = ({ state, onStateChange, disabled = false }) => {
    const handlePress = () => {
        if (disabled) return;

        if (state === 'idle') {
            onStateChange('connecting');
        } else {
            // Any active state (connecting, listening, thinking, translating) -> Stop
            onStateChange('idle');
        }
    };

    // Enterprise color palette - muted, professional
    const getButtonColor = () => {
        switch (state) {
            case 'listening':
                return colors.listening;    // Muted emerald #059669
            case 'thinking':
                return colors.thinking;     // Deep amber #D97706
            case 'translating':
                return colors.translating;  // Primary blue #2563EB
            case 'connecting':
                return colors.connecting;   // Primary blue #2563EB
            case 'idle':
            default:
                return colors.primary;      // Primary blue #2563EB
        }
    };

    // Get pulse ring color with theme-aware opacity
    const getPulseColor = () => {
        switch (state) {
            case 'listening':
                return 'var(--color-listening-pulse)';
            case 'thinking':
                return 'var(--color-thinking-pulse)';
            case 'translating':
                return 'var(--color-translating-pulse)';
            case 'connecting':
            default:
                return 'var(--color-connecting-pulse)';
        }
    };

    const getIconBorderRadius = () => {
        return state === 'idle' || state === 'connecting' ? 20 : 8;
    };

    // Helper to determine if we are in an active session
    const isActive = state !== 'idle';

    return (
        <div className="relative flex items-center justify-center w-[100px] h-[100px]">
            {/* Single Subtle Pulse Ring */}
            {isActive && (
                <motion.div
                    className="absolute w-[100px] h-[100px] rounded-full"
                    style={{
                        border: `2px solid ${getPulseColor()}`,
                    }}
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.1, 0.4],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Main Button */}
            <motion.button
                onClick={handlePress}
                disabled={disabled}
                aria-label={state === 'idle' ? 'Start recording' : 'Stop recording'}
                className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--color-border)',
                }}
                whileHover={{
                    boxShadow: 'var(--shadow-md)',
                }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                transition={{ duration: 0.15 }}
            >
                {/* Icon - 36x36 size, dynamic border radius */}
                <motion.div
                    className="w-9 h-9 relative overflow-hidden"
                    style={{
                        backgroundColor: getButtonColor(),
                    }}
                    animate={{
                        backgroundColor: getButtonColor(),
                        borderRadius: getIconBorderRadius(),
                    }}
                    transition={{ duration: 0.2 }}
                />
            </motion.button>
        </div>
    );
};

RecordButtonComponent.displayName = 'RecordButton';

export const RecordButton = memo(RecordButtonComponent);

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { RecordingState } from '@/types';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

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

    const getButtonColor = () => {
        switch (state) {
            case 'listening':
                return colors.success; // Teal/Green for user speaking
            case 'thinking':
                return colors.warning; // Amber/Orange for processing
            case 'translating':
                return colors.primary; // Purple for agent speaking
            case 'connecting':
                return colors.connectingBlue;
            case 'idle':
            default:
                return colors.primary;
        }
    };

    const getIconBorderRadius = () => {
        return state === 'idle' || state === 'connecting' ? 20 : 8;
    };

    // Helper to determine if we are in an active session
    const isActive = state !== 'idle';

    return (
        <div className="relative flex items-center justify-center w-[120px] h-[120px]">
            {/* Pulse Rings */}
            {isActive && (
                <>
                    {[0, 1, 2].map((index) => (
                        <motion.div
                            key={index}
                            className="absolute w-[120px] h-[120px] rounded-full border-[8px]"
                            style={{
                                borderColor: state === 'listening' ? 'rgba(46, 204, 113, 0.3)' :
                                    state === 'thinking' ? 'rgba(241, 196, 15, 0.3)' :
                                        state === 'translating' ? 'rgba(155, 89, 182, 0.3)' :
                                            'rgba(98, 146, 158, 0.4)', // connecting
                            }}
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{
                                scale: state === 'thinking'
                                    ? [1, 1.1, 1] // Tight pulse for thinking
                                    : index === 0 ? [1, 1.3, 1] : index === 1 ? [1, 1.8, 1] : [1, 2.2, 1],
                                opacity: index === 0 ? [0, 0.4, 0] : index === 1 ? [0, 0.2, 0] : [0, 0.1, 0],
                            }}
                            transition={{
                                duration: state === 'thinking' ? 1.5 : (state === 'connecting' ? 1.2 : 2),
                                delay: state === 'thinking' ? index * 0.2 : (state === 'connecting' ? index * 0.4 : index * 0.667),
                                repeat: Infinity,
                                ease: state === 'thinking' ? 'linear' : 'easeOut',
                            }}
                        />
                    ))}
                </>
            )}

            {/* Main Button */}
            <motion.button
                onClick={handlePress}
                disabled={disabled}
                aria-label={state === 'idle' ? 'Start recording' : 'Stop recording'}
                className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                    backgroundColor: colors.background,
                    boxShadow: shadows.elevated.boxShadow,
                }}
                animate={{
                    scale: state === 'connecting'
                        ? [1, 1.05, 1.08, 1.05, 1]
                        : state === 'translating'
                            ? [1, 1.05, 1] // Pulse when speaking
                            : 1,
                }}
                transition={{
                    scale: {
                        duration: state === 'connecting' ? 1.2 : 0.5,
                        repeat: state === 'connecting' || state === 'translating' ? Infinity : 0,
                        ease: 'easeInOut',
                    },
                }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
            >
                {/* Icon - 40x40 size, dynamic border radius */}
                <motion.div
                    className="w-10 h-10 relative overflow-hidden"
                    style={{
                        backgroundColor: getButtonColor(),
                    }}
                    animate={{
                        backgroundColor: getButtonColor(),
                        borderRadius: getIconBorderRadius(),
                    }}
                    transition={{ duration: 0.3 }}
                />
            </motion.button>
        </div>
    );
};

RecordButtonComponent.displayName = 'RecordButton';

export const RecordButton = memo(RecordButtonComponent);

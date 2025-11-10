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
    } else if (state === 'recording' || state === 'connecting') {
      // Stop recording or cancel connecting
      onStateChange('idle');
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'recording':
        return colors.recordingRed;
      case 'connecting':
        return colors.connectingBlue;
      default:
        return colors.primary;
    }
  };

  const getIconBorderRadius = () => {
    return state === 'recording' ? 8 : 20;
  };

  return (
    <div className="relative flex items-center justify-center w-[120px] h-[120px]">
      {/* Pulse Rings - Match React Native: 3 rings with different scales */}
      {(state === 'connecting' || state === 'recording') && (
        <>
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="absolute w-[120px] h-[120px] rounded-full border-[8px]"
              style={{
                borderColor: state === 'recording'
                  ? 'rgba(231, 76, 60, 0.3)'
                  : 'rgba(98, 146, 158, 0.4)',
              }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{
                scale: index === 0 ? [1, 1.3, 1] : index === 1 ? [1, 1.8, 1] : [1, 2.2, 1],
                opacity: index === 0 ? [0, 0.4, 0] : index === 1 ? [0, 0.2, 0] : [0, 0.1, 0],
              }}
              transition={{
                duration: state === 'connecting' ? 1.2 : 2,
                delay: state === 'connecting' ? index * 0.4 : index * 0.667,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Main Button */}
      <motion.button
        onClick={handlePress}
        disabled={disabled}
        className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: colors.background,
          boxShadow: shadows.elevated.boxShadow,
        }}
        animate={{
          rotate: state === 'connecting' ? 360 : 0,
          scale: state === 'connecting'
            ? [1, 1.05, 1.08, 1.05, 1]
            : state === 'recording'
            ? [1, 1.02, 1]
            : 1,
        }}
        transition={{
          rotate: {
            duration: 1.2,
            repeat: state === 'connecting' ? Infinity : 0,
            ease: 'linear',
          },
          scale: {
            duration: state === 'connecting' ? 1.2 : state === 'recording' ? 2 : 0.3,
            repeat: state === 'connecting' || state === 'recording' ? Infinity : 0,
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

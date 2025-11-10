'use client';

import React, { useEffect, useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: colors.success,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke={colors.white}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case 'error':
      return {
        backgroundColor: colors.error,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={colors.white} strokeWidth="2" />
            <path d="M15 9l-6 6M9 9l6 6" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      };
    case 'warning':
      return {
        backgroundColor: colors.warning,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke={colors.white}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
      };
    case 'info':
      return {
        backgroundColor: colors.info,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={colors.white} strokeWidth="2" />
            <path d="M12 16v-4M12 8h.01" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      };
  }
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 4000,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);
  const config = getToastConfig(type);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / duration) * 50;
        if (newProgress <= 0) {
          clearInterval(interval);
          onDismiss(id);
          return 0;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    onDismiss(id);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Dismiss if dragged up more than 50px
    if (info.offset.y < -50) {
      onDismiss(id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      drag="y"
      dragConstraints={{ top: -100, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className="relative w-full max-w-sm mx-auto"
      style={{
        touchAction: 'none',
      }}
    >
      <div
        className="flex items-center gap-3 rounded-2xl overflow-hidden cursor-pointer"
        onClick={handleDismiss}
        style={{
          backgroundColor: config.backgroundColor,
          boxShadow: shadows.elevated.boxShadow,
          padding: '14px 16px',
          minHeight: '56px',
        }}
      >
        {/* Icon */}
        <div className="flex-shrink-0">{config.icon}</div>

        {/* Message */}
        <p
          className="text-sm font-medium flex-1 leading-snug"
          style={{ color: colors.white }}
        >
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke={colors.white}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 rounded-b-2xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          width: `${progress}%`,
        }}
        initial={{ width: '100%' }}
        animate={{ width: `${progress}%` }}
      />
    </motion.div>
  );
};

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

interface SkeletonLoaderProps {
  variant?: 'circle' | 'rectangle' | 'text';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangle',
  width,
  height,
  className = '',
}) => {
  const getStyles = () => {
    const baseStyles = {
      backgroundColor: colors.silverAlpha(0.15),
      boxShadow: shadows.pressed.boxShadow,
    };

    switch (variant) {
      case 'circle':
        return {
          ...baseStyles,
          width: width || '80px',
          height: height || '80px',
          borderRadius: '50%',
        };
      case 'text':
        return {
          ...baseStyles,
          width: width || '150px',
          height: height || '16px',
          borderRadius: '8px',
        };
      case 'rectangle':
      default:
        return {
          ...baseStyles,
          width: width || '100%',
          height: height || '40px',
          borderRadius: '12px',
        };
    }
  };

  return (
    <motion.div
      className={className}
      style={getStyles()}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
    />
  );
};

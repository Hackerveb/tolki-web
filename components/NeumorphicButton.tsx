'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

interface NeumorphicButtonProps {
  title?: string;
  variant?: 'default' | 'primary' | 'secondary';
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  title,
  variant = 'default',
  children,
  disabled = false,
  className = '',
  textClassName = '',
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  type = 'button',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    onMouseDown?.(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(false);
    onMouseUp?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(false);
    onMouseLeave?.(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          color: colors.white,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          color: colors.white,
        };
      default:
        return {
          backgroundColor: colors.background,
          color: colors.foreground,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const currentShadow = isPressed ? shadows.buttonPressed : shadows.button;

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        relative
        px-6 py-4
        rounded-2xl
        flex items-center justify-center
        min-h-[48px]
        cursor-pointer
        select-none
        border-none
        outline-none
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        boxShadow: currentShadow.boxShadow,
      }}
    >
      {children || (
        title && (
          <span
            className={`
              text-sm font-medium tracking-wide uppercase
              ${disabled ? 'opacity-70' : ''}
              ${textClassName}
            `}
            style={{ color: variantStyles.color }}
          >
            {title}
          </span>
        )
      )}
    </motion.button>
  );
};

'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { colors } from '@/styles/colors';

interface NeumorphicButtonProps {
  title?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
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
  const [isHovered, setIsHovered] = useState(false);

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
    setIsHovered(false);
    onMouseLeave?.(e);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const getVariantStyles = (): {
    backgroundColor: string;
    background?: string;
    color: string;
    border: string;
    hoverBg?: string;
  } => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
          color: 'var(--color-on-primary)',
          border: 'none',
          hoverBg: colors.primaryHover,
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          border: 'none',
        };
      case 'destructive':
        return {
          backgroundColor: colors.error,
          color: 'var(--color-on-error)',
          border: 'none',
        };
      default:
        return {
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Modern shadow system
  const getShadow = () => {
    if (isPressed) return 'inset 0 2px 6px rgba(0,0,0,0.15)';
    if (isHovered) return 'var(--shadow-md)';
    if (variant === 'ghost') return 'none';
    return 'var(--shadow-sm)';
  };

  // Background on hover
  const getBackground = () => {
    if (isHovered && variantStyles.hoverBg) {
      return variantStyles.hoverBg;
    }
    if (isHovered && variant === 'ghost') {
      return 'var(--color-neutral-100)';
    }
    return variantStyles.background || variantStyles.backgroundColor;
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      whileTap={{ scale: disabled ? 1 : 0.97, y: disabled ? 0 : 1 }}
      transition={{ duration: 0.15 }}
      className={`
        relative
        px-4 py-3
        rounded-lg
        flex items-center justify-center
        min-h-[44px]
        cursor-pointer
        select-none
        outline-none
        transition-all duration-150
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        background: getBackground(),
        boxShadow: getShadow(),
        border: variantStyles.border,
        color: variantStyles.color,
      }}
    >
      {children || (
        title && (
          <span
            className={`
              text-sm font-medium tracking-wide
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

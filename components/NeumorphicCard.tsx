import React from 'react';
import { shadows } from '@/styles/neumorphic';
import { colors } from '@/styles/colors';

interface NeumorphicCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'pressed' | 'subtle';
  padding?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const NeumorphicCard: React.FC<NeumorphicCardProps> = ({
  children,
  variant = 'elevated',
  padding = true,
  className = '',
  style = {},
}) => {
  const getVariantShadow = () => {
    switch (variant) {
      case 'pressed':
        return shadows.pressed;
      case 'subtle':
        return shadows.subtle;
      case 'elevated':
      default:
        return shadows.elevated;
    }
  };

  const variantShadow = getVariantShadow();

  return (
    <div
      className={`
        rounded-2xl
        ${padding ? 'p-4' : ''}
        ${className}
      `}
      style={{
        backgroundColor: colors.background,
        boxShadow: variantShadow.boxShadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

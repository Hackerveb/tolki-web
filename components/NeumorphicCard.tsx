import React from 'react';

interface NeumorphicCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'pressed' | 'subtle' | 'bordered';
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
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'pressed':
        return {
          boxShadow: 'var(--shadow-inner)',
          border: '1px solid var(--color-border)',
        };
      case 'subtle':
        return {
          boxShadow: 'var(--shadow-xs)',
          border: '1px solid var(--color-border)',
        };
      case 'bordered':
        return {
          boxShadow: 'none',
          border: '1px solid var(--color-border)',
        };
      case 'elevated':
      default:
        return {
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <div
      className={`
        rounded-xl
        ${padding ? 'p-4' : ''}
        ${className}
      `}
      style={{
        backgroundColor: 'var(--color-surface)',
        ...variantStyles,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/styles/colors';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  showBack?: boolean;
  transparent?: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  rightElement,
  showBack = true,
  transparent = false,
  className = '',
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header
      className={`
        ${transparent ? 'bg-transparent' : 'bg-[var(--color-background)]'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section */}
        <div className="flex-1 flex items-center justify-start">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-2xl transition-opacity hover:opacity-70 active:opacity-50"
              style={{ color: colors.foreground }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
        </div>

        {/* Center Section */}
        <div className="flex-[2] flex items-center justify-center">
          {title && (
            <h1
              className="text-base font-medium text-center"
              style={{ color: colors.foreground }}
            >
              {title}
            </h1>
          )}
        </div>

        {/* Right Section */}
        <div className="flex-1 flex items-center justify-end">
          {rightElement}
        </div>
      </div>
    </header>
  );
};

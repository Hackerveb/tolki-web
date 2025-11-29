'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  showBack?: boolean;
  transparent?: boolean;
  className?: string;
}

const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M19 12H5M12 19l-7-7 7-7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
              className="p-2 -ml-2 transition-opacity hover:opacity-70 active:opacity-50"
              style={{ color: 'var(--color-text-primary)' }}
              aria-label="Go back"
            >
              <BackArrowIcon />
            </button>
          )}
        </div>

        {/* Center Section */}
        <div className="flex-[2] flex items-center justify-center">
          {title && (
            <h1
              className="text-base font-medium text-center"
              style={{ color: 'var(--color-text-primary)' }}
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

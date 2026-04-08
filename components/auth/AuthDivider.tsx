'use client';

import React from 'react';

interface AuthDividerProps {
  label?: string;
}

export const AuthDivider: React.FC<AuthDividerProps> = ({ label = 'or continue with' }) => {
  return (
    <div className="flex items-center gap-4 my-6" role="separator">
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'var(--glass-border)' }}
      />
      <span
        className="text-xs font-medium select-none"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'var(--glass-border)' }}
      />
    </div>
  );
};

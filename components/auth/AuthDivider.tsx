'use client';

import React from 'react';

export const AuthDivider: React.FC = () => {
  return (
    <div className="flex items-center gap-4 my-6">
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'var(--color-border)' }}
      />
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        or continue with
      </span>
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'var(--color-border)' }}
      />
    </div>
  );
};

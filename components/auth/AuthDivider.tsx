'use client';

import React from 'react';
import { colors } from '@/styles/colors';

export const AuthDivider: React.FC = () => {
  return (
    <div className="flex items-center gap-4 my-6">
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: colors.silverAlpha(0.3) }}
      />
      <span
        className="text-xs font-medium"
        style={{ color: colors.silverAlpha(0.6) }}
      >
        or continue with
      </span>
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: colors.silverAlpha(0.3) }}
      />
    </div>
  );
};

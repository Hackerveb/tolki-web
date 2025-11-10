'use client';

import React from 'react';
import { ToastContainer } from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
};

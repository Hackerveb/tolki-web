'use client';

import React, { useEffect } from 'react';
import { ToastContainer } from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Non-fatal: app works without service worker
          console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
};

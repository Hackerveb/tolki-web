'use client';

import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Toast, ToastProps } from './Toast';

interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onDismiss'>[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed top-0 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none"
      style={{
        zIndex: 10000,
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.slice(0, 3).map((toast) => (
          <div key={toast.id} className="w-full pointer-events-auto">
            <Toast {...toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{
              paddingLeft: 'max(20px, env(safe-area-inset-left))',
              paddingRight: 'max(20px, env(safe-area-inset-right))',
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl pointer-events-auto"
              style={{
                backgroundColor: 'var(--color-surface)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)',
                padding: '24px',
              }}
            >
              <h2
                id="confirm-dialog-title"
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-message"
                className="text-sm leading-relaxed mb-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 font-medium transition-all active:scale-[0.98]"
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 font-medium transition-all active:scale-[0.98]"
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    backgroundColor: isDangerous ? 'var(--color-error)' : 'var(--color-primary)',
                    color: isDangerous ? 'var(--color-on-error)' : 'var(--color-on-primary)',
                    border: 'none',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

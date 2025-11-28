'use client';

import { create } from 'zustand';
import { ToastType } from '@/components/Toast';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  clearAll: () => set({ toasts: [] }),
}));

export const useToast = () => {
  const { addToast, removeToast, toasts, clearAll } = useToastStore();

  const toast = {
    success: (message: string, duration?: number) => {
      addToast({ type: 'success', message, duration });
    },
    error: (message: string, duration?: number) => {
      addToast({ type: 'error', message, duration });
    },
    info: (message: string, duration?: number) => {
      addToast({ type: 'info', message, duration });
    },
    warning: (message: string, duration?: number) => {
      addToast({ type: 'warning', message, duration });
    },
  };

  return {
    toast,
    toasts,
    removeToast,
    clearAll,
  };
};

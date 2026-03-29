'use client';

import { useEffect, useLayoutEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ThemeStore {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  _hydrated: boolean;
  setTheme: (theme: Theme) => void;
  setResolvedTheme: (resolved: 'light' | 'dark') => void;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      resolvedTheme: 'light',
      _hydrated: false,
      setTheme: (theme) => set({ theme }),
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
    }),
    {
      name: 'tolki-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

// Provider hook — call once in ClientLayout to keep theme in sync on every page
export const useThemeProvider = () => {
  const { theme, _hydrated, setResolvedTheme } = useThemeStore();

  // Use layout effect to apply theme before browser paint — prevents flash
  useIsomorphicLayoutEffect(() => {
    if (!_hydrated) return;

    const resolved = resolveTheme(theme);
    applyThemeToDOM(resolved);
    setResolvedTheme(resolved);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const r = e.matches ? 'dark' : 'light';
        applyThemeToDOM(r);
        setResolvedTheme(r);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, _hydrated, setResolvedTheme]);
};

// Consumer hook — use in any component that needs theme info or toggle
export const useTheme = () => {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
};

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'nb' | 'en';

interface LocaleStore {
  locale: Locale;
  _hydrated: boolean;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'nb',
      _hydrated: false,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'tolki-locale',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);

export const useLocale = () => {
  const { locale, setLocale } = useLocaleStore();
  return { locale, setLocale };
};

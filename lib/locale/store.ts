"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "@/types/locale";

type PersistedLocale = { language: Locale; currency: string | null };
type LocaleState = PersistedLocale & {
  availableCurrencies: string[];
  hydrated: boolean;
  setLanguage: (language: Locale) => void;
  setCurrency: (currency: string) => void;
  initialize: (defaults: { language: Locale; currency: string; activeCurrencies: readonly string[] }) => void;
  markHydrated: () => void;
};

export const useLocaleStore = create<LocaleState>()(persist((set, get) => ({
  language: "ar",
  currency: null,
  availableCurrencies: [],
  hydrated: false,
  setLanguage: (language) => set({ language }),
  setCurrency: (currency) => {
    if (get().availableCurrencies.includes(currency)) set({ currency });
  },
  initialize: ({ language, currency, activeCurrencies }) => {
    const active = [...new Set(activeCurrencies.map((code) => code.toUpperCase()))];
    const savedCurrency = get().currency;
    const savedLanguage = get().language;
    set({
      language: savedLanguage === "ar" || savedLanguage === "en" ? savedLanguage : language,
      currency: savedCurrency && active.includes(savedCurrency) ? savedCurrency : active.includes(currency) ? currency : active[0] ?? null,
      availableCurrencies: active,
      hydrated: true,
    });
  },
  markHydrated: () => set({ hydrated: true }),
}), {
  name: "7zma.locale.v1",
  storage: createJSONStorage(() => localStorage),
  partialize: (state): PersistedLocale => ({ language: state.language, currency: state.currency }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<PersistedLocale> | undefined;
    return {
      ...current,
      language: saved?.language === "en" ? "en" : "ar",
      currency: typeof saved?.currency === "string" ? saved.currency.toUpperCase() : null,
    };
  },
  onRehydrateStorage: () => (state) => state?.markHydrated(),
}));

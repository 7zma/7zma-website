"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type BundleItem = { productId: string; quantity: number };
type PersistedBundle = { items: BundleItem[] };
type BundleState = PersistedBundle & {
  add: (productId: string, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  hydrateValidated: (items: readonly BundleItem[]) => void;
};

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export function isValidBundle(value: unknown): value is BundleItem[] {
  return Array.isArray(value) && value.length <= 50 && value.every((item) =>
    typeof item === "object" && item !== null &&
    "productId" in item && typeof item.productId === "string" &&
    /^[0-9a-f-]{8}-[0-9a-f-]{4}-[1-8][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}$/i.test(item.productId) &&
    "quantity" in item && typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20,
  );
}

export const useBundleStore = create<BundleState>()(persist((set) => ({
  items: [],
  add: (productId, quantity = 1) => set((state) => {
    if (!/^[0-9a-f-]{8}-[0-9a-f-]{4}-[1-8][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}$/i.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return state;
    const current = state.items.find((item) => item.productId === productId);
    if (!current && state.items.length >= 50) return state;
    const next = current
      ? state.items.map((item) => item.productId === productId ? { ...item, quantity: Math.min(20, item.quantity + quantity) } : item)
      : [...state.items, { productId, quantity }];
    return { items: next };
  }),
  remove: (productId) => set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
  setQuantity: (productId, quantity) => set((state) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return state;
    return { items: state.items.map((item) => item.productId === productId ? { ...item, quantity } : item) };
  }),
  clear: () => set({ items: [] }),
  hydrateValidated: (items) => set({ items: isValidBundle(items) ? [...items] : [] }),
}), {
  name: "7zma.bundle.v1",
  version: 1,
  storage: createJSONStorage(() => typeof window === "undefined" ? serverStorage : window.localStorage),
  partialize: (state): PersistedBundle => ({ items: state.items }),
  migrate: (persisted) => {
    const saved = persisted as { items?: unknown };
    return { items: isValidBundle(saved?.items) ? saved.items : [] };
  },
  merge: (persisted, current) => {
    const saved = persisted as { items?: unknown } | undefined;
    return { ...current, items: isValidBundle(saved?.items) ? saved.items : [] };
  },
  skipHydration: true,
}));

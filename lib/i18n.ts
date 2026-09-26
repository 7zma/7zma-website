import ar from "@/i18n/ar.json";
import en from "@/i18n/en.json";
import type { Locale } from "@/types/locale";

export const messages = { ar, en } as const;
export type MessageKey = keyof typeof ar;

export function getMessages(locale: Locale) {
  return messages[locale];
}

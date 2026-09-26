import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizeInternationalPhone(input: string): string | null {
  const normalized = input.trim();
  if (!normalized.startsWith("+")) return null;
  const parsed = parsePhoneNumberFromString(normalized);
  if (!parsed?.isValid() || parsed.number !== normalized) return null;
  return parsed.number;
}

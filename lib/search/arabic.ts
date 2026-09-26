const arabicMarks = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeStoreSearch(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(arabicMarks, "")
    .replace(/[ـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesStoreSearch(query: string, ...values: readonly string[]): boolean {
  const normalizedQuery = normalizeStoreSearch(query);
  if (!normalizedQuery) return true;
  const compactQuery = normalizedQuery.replace(/\s+/g, "").replace(/ة/g, "ه");
  return values.some((value) => {
    const normalizedValue = normalizeStoreSearch(value);
    const compactValue = normalizedValue.replace(/\s+/g, "").replace(/ة/g, "ه");
    return normalizedValue.includes(normalizedQuery) || compactValue.includes(compactQuery);
  });
}

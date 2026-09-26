export type CurrencyDefinition = { code: string; symbol_ar: string; symbol_en: string; decimals: number };
export type ManualPrice = { price_minor: number; compare_at_price_minor: number | null };
export type FormattedPrice = { text: string; displayedCurrency: string; usedDefaultFallback: boolean };

export function formatManualPrice(
  prices: ReadonlyMap<string, ManualPrice>,
  selectedCurrency: string,
  defaultCurrency: string,
  currencies: ReadonlyMap<string, CurrencyDefinition>,
  locale: "ar" | "en",
): FormattedPrice | null {
  const selected = currencies.get(selectedCurrency);
  const fallback = currencies.get(defaultCurrency);
  const directPrice = prices.get(selectedCurrency);
  const defaultPrice = prices.get(defaultCurrency);
  if (!selected && !directPrice) return null;
  if (!directPrice && !fallback) return null;
  const usedDefaultFallback = !directPrice && selectedCurrency !== defaultCurrency;
  const price = directPrice ?? defaultPrice;
  const displayCurrency = directPrice ? selected : fallback;
  if (!price || !displayCurrency) return null;
  const factor = 10 ** displayCurrency.decimals;
  const number = (price.price_minor / factor).toLocaleString(locale + "-u-nu-latn", {
    minimumFractionDigits: displayCurrency.decimals,
    maximumFractionDigits: displayCurrency.decimals,
  });
  const symbol = locale === "ar" ? displayCurrency.symbol_ar : displayCurrency.symbol_en;
  return {
    text: locale === "ar" ? number + " " + symbol : symbol + number,
    displayedCurrency: displayCurrency.code,
    usedDefaultFallback,
  };
}

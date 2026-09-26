import { describe, expect, it } from "vitest";
import { formatManualPrice, type CurrencyDefinition, type ManualPrice } from "@/lib/money";

const currencies = new Map<string, CurrencyDefinition>([
  ["USD", { code: "USD", symbol_ar: "$", symbol_en: "$", decimals: 2 }],
  ["JPY", { code: "JPY", symbol_ar: "¥", symbol_en: "¥", decimals: 0 }],
]);

describe("manual currency pricing", () => {
  it("formats minor units with Western digits and configured decimals", () => {
    const prices = new Map<string, ManualPrice>([["JPY", { price_minor: 2100, compare_at_price_minor: null }]]);
    expect(formatManualPrice(prices, "JPY", "USD", currencies, "ar")?.text).toContain("2,100");
  });

  it("shows the manually entered default price when the chosen currency has no price", () => {
    const prices = new Map<string, ManualPrice>([["USD", { price_minor: 1599, compare_at_price_minor: null }]]);
    const result = formatManualPrice(prices, "JPY", "USD", currencies, "en");
    expect(result?.displayedCurrency).toBe("USD");
    expect(result?.usedDefaultFallback).toBe(true);
  });

  it("does not invent a converted price when neither manual price exists", () => {
    expect(formatManualPrice(new Map(), "JPY", "USD", currencies, "en")).toBeNull();
  });
});

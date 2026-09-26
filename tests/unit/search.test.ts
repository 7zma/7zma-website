import { describe, expect, it } from "vitest";
import { matchesStoreSearch, normalizeStoreSearch } from "@/lib/search/arabic";

describe("Arabic-aware search", () => {
  it("normalizes alef forms, diacritics, taa marbuta and digit variants", () => {
    expect(normalizeStoreSearch("إِلْعَبْ حَزْمَة ١٢٣")).toBe("العب حزمة 123");
  });

  it("matches normalized Arabic and English product text", () => {
    expect(matchesStoreSearch("إكسبوكس", "Xbox Series", "إكس بوكس")).toBe(true);
    expect(matchesStoreSearch("steam", "Steam Game Pass", "اشتراك ألعاب")).toBe(true);
  });
});

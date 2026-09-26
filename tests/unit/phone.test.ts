import { describe, expect, it } from "vitest";
import { normalizeInternationalPhone } from "@/lib/phone";

describe("international phone validation", () => {
  it("requires an explicit international prefix and valid number", () => {
    expect(normalizeInternationalPhone("2025550123")).toBeNull();
    expect(normalizeInternationalPhone("+12025550123")).toBe("+12025550123");
  });
});

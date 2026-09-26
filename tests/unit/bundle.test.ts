import { describe, expect, it } from "vitest";
import { isValidBundle } from "@/lib/bundle/store";

describe("persisted bundle validation", () => {
  it("accepts validated product ids and quantities", () => {
    expect(isValidBundle([{ productId: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 }])).toBe(true);
  });

  it("rejects malformed ids, quantities and oversized state", () => {
    expect(isValidBundle([{ productId: "not-an-id", quantity: 1 }])).toBe(false);
    expect(isValidBundle([{ productId: "550e8400-e29b-41d4-a716-446655440000", quantity: 0 }])).toBe(false);
  });
});

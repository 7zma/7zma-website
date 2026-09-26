import { describe, expect, it } from "vitest";
import { canonicalizeUsername, isValidUsernameFormat, levenshteinDistance } from "@/lib/username";

describe("username rules", () => {
  it("canonicalizes case, lookalikes, separators and repeated characters", () => {
    expect(canonicalizeUsername("AM0X")).toBe("amox");
    expect(canonicalizeUsername("A_M_O_X")).toBe("amox");
    expect(canonicalizeUsername("أحــــمد")).toBe("احمد");
  });

  it("accepts only bounded usernames without edge separators or all digits", () => {
    expect(isValidUsernameFormat("Player_7")).toBe(true);
    expect(isValidUsernameFormat("_Player")).toBe(false);
    expect(isValidUsernameFormat("123456")).toBe(false);
  });

  it("measures edit distance by Unicode character", () => {
    expect(levenshteinDistance("حزمة", "حزمه")).toBe(1);
  });
});

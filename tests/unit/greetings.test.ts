import { describe, expect, it } from "vitest";
import { getGreetingSlot } from "@/lib/greetings/engine";

const cases = [
  ["2026-01-01T11:59:59", "morning"],
  ["2026-01-01T12:00:00", "afternoon"],
  ["2026-01-01T16:59:59", "afternoon"],
  ["2026-01-01T17:00:00", "evening"],
  ["2026-01-01T20:59:59", "evening"],
  ["2026-01-01T21:00:00", "night"],
  ["2026-01-01T04:59:59", "night"],
  ["2026-01-01T05:00:00", "morning"],
] as const;

describe("local time greeting slots", () => {
  it.each(cases)("maps %s to %s", (date, expected) => {
    const [year, month, day, hour, minute, second] = date.split(/[-T:]/).map(Number);
    expect(getGreetingSlot(new Date(year, month - 1, day, hour, minute, second))).toBe(expected);
  });
});

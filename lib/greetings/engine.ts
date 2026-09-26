export type GreetingSlot = "morning" | "afternoon" | "evening" | "night";

export type GreetingBoundaries = {
  morning_start: string;
  afternoon_start: string;
  evening_start: string;
  night_start: string;
};

export type GreetingVariant = {
  id?: string;
  slot: GreetingSlot | "special";
  message_ar: string;
  message_en: string;
  icon_key: string;
  weight: number;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
};

export const defaultGreetingBoundaries: GreetingBoundaries = {
  morning_start: "05:00",
  afternoon_start: "12:00",
  evening_start: "17:00",
  night_start: "21:00",
};

function toMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new RangeError("Greeting boundary must use 24-hour HH:mm format");
  return Number(match[1]) * 60 + Number(match[2]);
}

export function getGreetingSlot(date: Date, boundaries = defaultGreetingBoundaries): GreetingSlot {
  const minute = date.getHours() * 60 + date.getMinutes();
  const morning = toMinutes(boundaries.morning_start);
  const afternoon = toMinutes(boundaries.afternoon_start);
  const evening = toMinutes(boundaries.evening_start);
  const night = toMinutes(boundaries.night_start);
  if (afternoon <= morning || evening <= afternoon || night <= evening) throw new RangeError("Greeting boundaries must be strictly ordered");
  if (minute >= night || minute < morning) return "night";
  if (minute < afternoon) return "morning";
  if (minute < evening) return "afternoon";
  return "evening";
}

function isInRange(variant: GreetingVariant, now: Date): boolean {
  const afterStart = variant.starts_at === null || new Date(variant.starts_at).getTime() <= now.getTime();
  const beforeEnd = variant.ends_at === null || new Date(variant.ends_at).getTime() > now.getTime();
  return afterStart && beforeEnd;
}

export function chooseGreeting(
  variants: readonly GreetingVariant[],
  slot: GreetingSlot,
  now: Date,
  random: () => number = Math.random,
): GreetingVariant | null {
  const candidates = variants.filter((variant) => isInRange(variant, now) && (variant.slot === "special" || variant.slot === slot));
  if (candidates.length === 0) return null;
  const special = candidates.filter((variant) => variant.slot === "special");
  const prioritized = special.length
    ? special.filter((variant) => variant.priority === Math.max(...special.map((item) => item.priority)))
    : candidates.filter((variant) => variant.slot === slot);
  const totalWeight = prioritized.reduce((total, item) => total + Math.max(1, item.weight), 0);
  let threshold = Math.min(Math.max(random(), 0), 0.999999999) * totalWeight;
  for (const item of prioritized) {
    threshold -= Math.max(1, item.weight);
    if (threshold < 0) return item;
  }
  return prioritized[prioritized.length - 1] ?? null;
}

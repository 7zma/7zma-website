export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

export const directionFor = (locale: Locale): Direction => (locale === "ar" ? "rtl" : "ltr");

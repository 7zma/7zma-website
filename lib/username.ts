const arabicMarks = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const lookalikes: Readonly<Record<string, string>> = { "0": "o", "1": "l", "5": "s", "@": "a", "$": "s" };

export function canonicalizeUsername(value: string): string {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("und")
    .replace(arabicMarks, "").replace(/[ـ]/gu, "")
    .replace(/[أإآٱ]/gu, "ا").replace(/ى/gu, "ي").replace(/ة/gu, "ه")
    .replace(/ؤ/gu, "و").replace(/ئ/gu, "ي")
    .replace(/[٠-٩]/gu, (digit) => String(digit.codePointAt(0)! - 0x0660))
    .replace(/[۰-۹]/gu, (digit) => String(digit.codePointAt(0)! - 0x06f0))
    .replace(/[_.-]/gu, "");
  const mapped = [...normalized].map((character) => lookalikes[character] ?? character).join("");
  return mapped.replace(/([\p{L}\p{N}])\1+/gu, "$1");
}

export function isValidUsernameFormat(value: string): boolean {
  const length = [...value].length;
  return length >= 3 && length <= 20 &&
    /^[A-Za-z0-9\u0660-\u0669\u06F0-\u06F9\u0621-\u063A\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FC_.-]+$/u.test(value) &&
    !/^[_.-]|[_.-]$/u.test(value) &&
    !/^[0-9\u0660-\u0669\u06F0-\u06F9]+$/u.test(value);
}

export function levenshteinDistance(left: string, right: string): number {
  const a = [...left];
  const b = [...right];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + Number(a[row - 1] !== b[column - 1]),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

import { DISPLAY_CELLS } from "./view";

export type DisplayNumber =
  { kind: "number"; text: string } | { kind: "tooLarge" };

/** Adds one to a string of digits, carrying as needed: "099" becomes "100". */
function increment(digits: string): string {
  const result = digits.split("");
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] !== "9") {
      result[i] = String(Number(result[i]) + 1);
      return result.join("");
    }
    result[i] = "0";
  }
  return `1${result.join("")}`;
}

/**
 * Fits a canonical decimal string from the API into the display's cells.
 * The minus sign takes a cell and the point does not. Decimals are rounded
 * half away from zero; a whole part that does not fit is too large.
 */
export function formatForDisplay(value: string): DisplayNumber {
  const negative = value.startsWith("-");
  const [whole = "0", fraction = ""] = (
    negative ? value.slice(1) : value
  ).split(".");
  const cells = DISPLAY_CELLS - (negative ? 1 : 0);
  if (whole.length > cells) return { kind: "tooLarge" };

  const places = cells - whole.length;
  let digits = whole + fraction.slice(0, places).padEnd(places, "0");
  if (Number(fraction[places] ?? "0") >= 5) digits = increment(digits);

  const wholeDigits = digits.length - places;
  if (wholeDigits > cells) return { kind: "tooLarge" };

  const roundedWhole = digits.slice(0, wholeDigits);
  const roundedFraction = digits.slice(wholeDigits).replace(/0+$/, "");
  const text = roundedFraction
    ? `${roundedWhole}.${roundedFraction}`
    : roundedWhole;
  const isZero = /^[0.]+$/.test(text);
  return { kind: "number", text: negative && !isZero ? `-${text}` : text };
}

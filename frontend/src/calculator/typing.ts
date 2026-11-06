// Editing the typed number. Pure string helpers; the display has 10 cells
// and a minus sign takes one of them.
import { DISPLAY_CELLS } from "./view";

const digitCount = (text: string) => text.replace(/[^0-9]/g, "").length;
const maxDigits = (text: string) =>
  DISPLAY_CELLS - (text.startsWith("-") ? 1 : 0);

export function appendDigit(text: string, digit: string): string {
  if (text === "0") return digit;
  if (text === "-0") return `-${digit}`;
  return digitCount(text) < maxDigits(text) ? text + digit : text;
}

export function appendPoint(text: string): string {
  if (text.includes(".")) return text;
  if (text === "" || text === "-") return `${text}0.`;
  return digitCount(text) < maxDigits(text) ? `${text}.` : text;
}

export function removeLast(text: string): string {
  return text.slice(0, -1);
}

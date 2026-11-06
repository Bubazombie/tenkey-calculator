import type { KeyDefinition } from "./keys";

// aria-keyshortcuts names physical keys. Characters that need Shift on a US
// layout are written as that key; the numeric keypad types the rest unmodified.
const ariaKeyNames: Readonly<Record<string, string>> = {
  "+": "Plus",
  "%": "Shift+5",
  "^": "Shift+6",
  "@": "Shift+2",
};

const spokenNames: Readonly<Record<string, string>> = {
  ".": "period",
  ",": "comma",
  "+": "plus sign",
  "-": "minus sign",
  "*": "asterisk",
  "/": "slash",
  "=": "equals sign",
  "%": "percent sign",
  "^": "caret",
  "@": "at sign",
};

/** The aria-keyshortcuts value for a key. */
export function ariaKeyShortcuts(key: KeyDefinition): string {
  return key.shortcuts
    .map((shortcut) => ariaKeyNames[shortcut] ?? shortcut)
    .join(" ");
}

const isDigitKey = (key: KeyDefinition) =>
  key.shortcuts.length === 1 && /^[0-9]$/.test(key.shortcuts[0] ?? "");

/** Screen reader help built from the key table, so it always matches the real shortcuts. */
export function shortcutHelp(keyTable: readonly KeyDefinition[]): string {
  const sentences = keyTable
    .filter((key) => !isDigitKey(key))
    .map((key) => {
      const spoken = key.shortcuts.map(
        (shortcut) => spokenNames[shortcut] ?? shortcut,
      );
      return `${key.name}: ${spoken.join(" or ")}.`;
    });
  return [
    "Keyboard shortcuts work while the calculator has focus.",
    "Digits: 0 to 9.",
    ...sentences,
  ].join(" ");
}

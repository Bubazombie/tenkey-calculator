import { expect, test } from "vitest";
import { keys, type KeyDefinition } from "./keys";
import { ariaKeyShortcuts, shortcutHelp } from "./shortcuts";

const keyById = (id: string): KeyDefinition => {
  const key = (keys as readonly KeyDefinition[]).find((k) => k.id === id);
  if (!key) throw new Error(`no key ${id}`);
  return key;
};

test.each([
  ["digit7", "7"],
  ["add", "Plus"],
  ["subtract", "-"],
  ["multiply", "*"],
  ["divide", "/"],
  ["percent", "Shift+5"],
  ["power", "Shift+6 Y"],
  ["squareRoot", "Shift+2 R"],
  ["equals", "Enter ="],
  ["decimal", ". ,"],
  ["backspace", "Backspace"],
  ["clear", "Escape Delete"],
])("aria-keyshortcuts for %s is %s", (id, expected) => {
  expect(ariaKeyShortcuts(keyById(id))).toBe(expected);
});

test("help text describes every shortcut in the key table", () => {
  expect(shortcutHelp(keys)).toBe(
    "Keyboard shortcuts work while the calculator has focus. Digits: 0 to 9. " +
      "Square root: at sign or R. Power: caret or Y. Percent: percent sign. " +
      "Backspace: Backspace. AC, clear all: Escape or Delete. Divided by: slash. " +
      "Times: asterisk. Minus: minus sign. Plus: plus sign. " +
      "Decimal point: period or comma. Equals: Enter or equals sign.",
  );
});

test("a new key appears in the help text without other changes", () => {
  const extra: KeyDefinition = {
    id: "modulo",
    legend: { type: "text", text: "mod" },
    kind: "operator",
    name: "Modulo",
    group: "pad",
    area: { column: 1, row: 1 },
    shortcuts: ["M"],
  };
  expect(shortcutHelp([extra])).toContain("Modulo: M.");
});

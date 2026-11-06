// The key table: the one place that defines every key of the keypad.
import type { BinaryOperation } from "./expression";

export type KeyKind = "digit" | "operator" | "function" | "equals";

export type KeyLegend =
  | { type: "text"; text: string }
  | { type: "power" }
  | { type: "squareRoot" }
  | { type: "backspace" };

/** What pressing the key does. */
export type KeyAction =
  | { type: "digit"; digit: string }
  | { type: "point" }
  | { type: "operator"; operation: BinaryOperation }
  | { type: "squareRoot" }
  | { type: "percent" }
  | { type: "equals" }
  | { type: "backspace" }
  | { type: "clear" };

/** Which recording the key plays: wide keys and Enter sound different. */
export type KeySound = "regular" | "wide" | "enter" | "backspace";

export interface GridArea {
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
}

export interface KeyDefinition {
  id: string;
  legend: KeyLegend;
  kind: KeyKind;
  /** Accessible name: the visible label when it is text, the spoken name when it is a symbol. */
  name: string;
  /** The function row sits above the keypad in its own grid. */
  group: "function" | "pad";
  area: GridArea;
  /** KeyboardEvent.key values that press this key. Letters match either case. */
  shortcuts: readonly string[];
  action: KeyAction;
  sound: KeySound;
}

const text = (value: string): KeyLegend => ({ type: "text", text: value });

const digit = <D extends string>(value: D, column: number, row: number) =>
  ({
    id: `digit${value}`,
    legend: text(value),
    kind: "digit",
    name: value,
    group: "pad",
    area: { column, row },
    shortcuts: [value],
    action: { type: "digit", digit: value },
    sound: "regular",
  }) as const satisfies KeyDefinition;

/** In DOM order, which is also the Tab order. */
export const keys = [
  {
    id: "squareRoot",
    legend: { type: "squareRoot" },
    kind: "function",
    name: "Square root",
    group: "function",
    area: { column: 1, row: 1 },
    shortcuts: ["@", "R"],
    action: { type: "squareRoot" },
    sound: "regular",
  },
  {
    id: "power",
    legend: { type: "power" },
    kind: "function",
    // The legend reads "xy", so the name starts with it (WCAG 2.5.3).
    name: "xy, power",
    group: "function",
    area: { column: 2, row: 1 },
    shortcuts: ["^", "Y"],
    action: { type: "operator", operation: "power" },
    sound: "regular",
  },
  {
    id: "percent",
    legend: text("%"),
    kind: "function",
    name: "Percent",
    group: "function",
    area: { column: 3, row: 1 },
    shortcuts: ["%"],
    action: { type: "percent" },
    sound: "regular",
  },
  {
    id: "backspace",
    legend: { type: "backspace" },
    kind: "function",
    name: "Backspace",
    group: "function",
    area: { column: 4, row: 1 },
    shortcuts: ["Backspace"],
    action: { type: "backspace" },
    sound: "backspace",
  },
  {
    id: "clear",
    legend: text("AC"),
    kind: "function",
    name: "AC, clear all",
    group: "pad",
    area: { column: 1, row: 1 },
    shortcuts: ["Escape", "Delete"],
    action: { type: "clear" },
    sound: "regular",
  },
  {
    id: "divide",
    legend: text("÷"),
    kind: "operator",
    name: "Divided by",
    group: "pad",
    area: { column: 2, row: 1 },
    shortcuts: ["/"],
    action: { type: "operator", operation: "divide" },
    sound: "regular",
  },
  {
    id: "multiply",
    legend: text("×"),
    kind: "operator",
    name: "Times",
    group: "pad",
    area: { column: 3, row: 1 },
    shortcuts: ["*"],
    action: { type: "operator", operation: "multiply" },
    sound: "regular",
  },
  {
    id: "subtract",
    legend: text("−"),
    kind: "operator",
    name: "Minus",
    group: "pad",
    area: { column: 4, row: 1 },
    shortcuts: ["-"],
    action: { type: "operator", operation: "subtract" },
    sound: "regular",
  },
  digit("7", 1, 2),
  digit("8", 2, 2),
  digit("9", 3, 2),
  {
    id: "add",
    legend: text("+"),
    kind: "operator",
    name: "Plus",
    group: "pad",
    area: { column: 4, row: 2, rowSpan: 2 },
    shortcuts: ["+"],
    action: { type: "operator", operation: "add" },
    sound: "wide",
  },
  digit("4", 1, 3),
  digit("5", 2, 3),
  digit("6", 3, 3),
  digit("1", 1, 4),
  digit("2", 2, 4),
  digit("3", 3, 4),
  {
    ...digit("0", 1, 5),
    area: { column: 1, row: 5, columnSpan: 2 },
    sound: "wide",
  },
  {
    id: "decimal",
    legend: text("."),
    kind: "digit",
    name: "Decimal point",
    group: "pad",
    area: { column: 3, row: 5 },
    shortcuts: [".", ","],
    action: { type: "point" },
    sound: "regular",
  },
  {
    id: "equals",
    legend: text("="),
    kind: "equals",
    name: "Equals",
    group: "pad",
    area: { column: 4, row: 4, rowSpan: 2 },
    shortcuts: ["Enter", "="],
    action: { type: "equals" },
    sound: "enter",
  },
] as const satisfies readonly KeyDefinition[];

export type KeyId = (typeof keys)[number]["id"];

const keysById = new Map<string, KeyDefinition>(
  keys.map((key) => [key.id, key]),
);

export function keyById(id: KeyId): KeyDefinition {
  const key = keysById.get(id);
  if (!key) throw new Error(`Unknown key ${id}`);
  return key;
}

/** Columns and rows of each grid. */
export const gridSizes = {
  function: { columns: 4, rows: 1 },
  pad: { columns: 4, rows: 5 },
} as const;

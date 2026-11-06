// The key table: the one place that defines every key of the keypad.

export type KeyKind = "digit" | "operator" | "function" | "equals";

export type KeyLegend =
  | { type: "text"; text: string }
  | { type: "power" }
  | { type: "squareRoot" }
  | { type: "backspace" };

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
}

const text = (value: string): KeyLegend => ({ type: "text", text: value });

const digit = (value: string, column: number, row: number): KeyDefinition => ({
  id: `digit${value}`,
  legend: text(value),
  kind: "digit",
  name: value,
  group: "pad",
  area: { column, row },
  shortcuts: [value],
});

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
  },
  {
    id: "percent",
    legend: text("%"),
    kind: "function",
    name: "Percent",
    group: "function",
    area: { column: 3, row: 1 },
    shortcuts: ["%"],
  },
  {
    id: "backspace",
    legend: { type: "backspace" },
    kind: "function",
    name: "Backspace",
    group: "function",
    area: { column: 4, row: 1 },
    shortcuts: ["Backspace"],
  },
  {
    id: "clear",
    legend: text("AC"),
    kind: "function",
    name: "AC, clear all",
    group: "pad",
    area: { column: 1, row: 1 },
    shortcuts: ["Escape", "Delete"],
  },
  {
    id: "divide",
    legend: text("÷"),
    kind: "operator",
    name: "Divided by",
    group: "pad",
    area: { column: 2, row: 1 },
    shortcuts: ["/"],
  },
  {
    id: "multiply",
    legend: text("×"),
    kind: "operator",
    name: "Times",
    group: "pad",
    area: { column: 3, row: 1 },
    shortcuts: ["*"],
  },
  {
    id: "subtract",
    legend: text("−"),
    kind: "operator",
    name: "Minus",
    group: "pad",
    area: { column: 4, row: 1 },
    shortcuts: ["-"],
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
  },
  digit("4", 1, 3),
  digit("5", 2, 3),
  digit("6", 3, 3),
  digit("1", 1, 4),
  digit("2", 2, 4),
  digit("3", 3, 4),
  { ...digit("0", 1, 5), area: { column: 1, row: 5, columnSpan: 2 } },
  {
    id: "decimal",
    legend: text("."),
    kind: "digit",
    name: "Decimal point",
    group: "pad",
    area: { column: 3, row: 5 },
    shortcuts: [".", ","],
  },
  {
    id: "equals",
    legend: text("="),
    kind: "equals",
    name: "Equals",
    group: "pad",
    area: { column: 4, row: 4, rowSpan: 2 },
    shortcuts: ["Enter", "="],
  },
] as const satisfies readonly KeyDefinition[];

export type KeyId = (typeof keys)[number]["id"];

/** Columns and rows of each grid. */
export const gridSizes = {
  function: { columns: 4, rows: 1 },
  pad: { columns: 4, rows: 5 },
} as const;

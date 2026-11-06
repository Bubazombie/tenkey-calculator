import { messages } from "../calculator/messages";
import type { MachineView, TapeEntry } from "../calculator/view";

const base: MachineView = {
  tape: [],
  topLine: { kind: "empty" },
  digits: "0",
  pressedKeys: [],
  keyboardActive: true,
  soundOn: true,
};

const referenceTape: TapeEntry[] = [
  { operation: "add", operands: ["0.1", "0.2"], result: "0.3" },
  { operation: "divide", operands: ["8", "0"], result: null },
  { operation: "sqrt", operands: ["144"], result: "12" },
  { operation: "power", operands: ["2", "10"], result: "1024" },
];

/** Machine states for review and tests. */
export const fixtures = {
  /** Exactly what design/reference.html shows. */
  reference: {
    ...base,
    tape: referenceTape,
    topLine: {
      kind: "expression",
      operation: "power",
      operands: ["2", "10"],
      finished: true,
    },
    digits: "1024",
    pressedKeys: ["digit5"],
  },
  fresh: { ...base, keyboardActive: false },
  pending: {
    ...base,
    tape: referenceTape,
    topLine: {
      kind: "expression",
      operation: "multiply",
      operands: ["12"],
      finished: false,
    },
    digits: "3",
  },
  "negative-limit": {
    ...base,
    tape: referenceTape,
    topLine: {
      kind: "expression",
      operation: "subtract",
      operands: ["1", "123456790"],
      finished: true,
    },
    digits: "-123456789",
  },
  full: {
    ...base,
    tape: referenceTape,
    topLine: {
      kind: "expression",
      operation: "multiply",
      operands: ["98765", "100000"],
      finished: true,
    },
    digits: "9876500000",
  },
  calculating: {
    ...base,
    tape: referenceTape,
    topLine: { kind: "message", text: messages.calculating },
    digits: "3",
  },
  "api-error": {
    ...base,
    tape: [
      ...referenceTape.slice(1),
      { operation: "divide", operands: ["8", "0"], result: null },
    ],
    topLine: { kind: "message", text: messages.divisionByZero },
    digits: "Error",
  },
  "too-large": {
    ...base,
    tape: [
      ...referenceTape.slice(1),
      { operation: "multiply", operands: ["100000", "100000"], result: null },
    ],
    topLine: { kind: "message", text: messages.tooLargeToDisplay },
    digits: "Error",
  },
  "no-connection": {
    ...base,
    tape: referenceTape,
    topLine: { kind: "message", text: messages.noConnection },
    digits: "3",
  },
  "long-tape": {
    ...base,
    tape: [
      {
        operation: "add",
        operands: ["1234567890", "8765432109"],
        result: "9999999999",
      },
      {
        operation: "subtract",
        operands: ["-500000000", "499999999"],
        result: "-999999999",
      },
      {
        operation: "percent_of",
        operands: ["9999999999", "10"],
        result: "999999999.9",
      },
      {
        operation: "divide",
        operands: ["9999999999", "0.0000000001"],
        result: null,
      },
    ],
    topLine: {
      kind: "expression",
      operation: "divide",
      operands: ["9999999999", "0.0000000001"],
      finished: true,
    },
    digits: "Error",
  },
  quiet: {
    ...base,
    tape: referenceTape,
    digits: "1024",
    keyboardActive: false,
    soundOn: false,
  },
} satisfies Record<string, MachineView>;

export type FixtureName = keyof typeof fixtures;

export const fixtureNames = Object.keys(fixtures) as FixtureName[];

/** The fixture named by ?fixture=name, or the fresh machine. */
export function fixtureFromSearch(search: string): MachineView {
  const name = new URLSearchParams(search).get("fixture");
  return name !== null && Object.hasOwn(fixtures, name)
    ? fixtures[name as FixtureName]
    : fixtures.fresh;
}

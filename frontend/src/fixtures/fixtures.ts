import { messages } from "../calculator/messages";
import type { MachineView, TapeEntry } from "../calculator/view";

const base: MachineView = {
  tape: [],
  topLine: { kind: "empty" },
  digits: "0",
  pressedKeys: [],
  keyboardActive: true,
  soundOn: true,
  announcement: "",
  announcementId: 0,
};

const referenceTape: TapeEntry[] = [
  { id: 1, operation: "add", operands: ["0.1", "0.2"], result: "0.3" },
  { id: 2, operation: "divide", operands: ["8", "0"], result: null },
  { id: 3, operation: "sqrt", operands: ["144"], result: "12" },
  { id: 4, operation: "power", operands: ["2", "10"], result: "1024" },
];

/** Machine states the real calculator can reach, for component tests. */
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
      { id: 5, operation: "divide", operands: ["8", "0"], result: null },
    ],
    topLine: { kind: "message", text: messages.divisionByZero },
    digits: "Error",
  },
  "too-large": {
    ...base,
    tape: [
      ...referenceTape.slice(1),
      {
        id: 5,
        operation: "multiply",
        operands: ["100000", "100000"],
        result: null,
      },
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
        id: 1,
        operation: "add",
        operands: ["1234567890", "8765432109"],
        result: "9999999999",
      },
      {
        id: 2,
        operation: "subtract",
        operands: ["-500000000", "499999999"],
        result: "-999999999",
      },
      {
        id: 3,
        operation: "percent_of",
        operands: ["9999999999", "10"],
        result: "999999999.9",
      },
      {
        id: 4,
        operation: "divide",
        operands: ["9999999999", "0.000000001"],
        result: null,
      },
    ],
    topLine: { kind: "message", text: messages.tooLargeToDisplay },
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

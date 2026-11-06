import type { Operation } from "./expression";
import type { KeyId } from "./keys";

/** One printed line of the tape. A null result is a failed calculation. */
export interface TapeEntry {
  operation: Operation;
  operands: readonly string[];
  result: string | null;
}

export type TopLine =
  | { kind: "empty" }
  | {
      kind: "expression";
      operation: Operation;
      operands: readonly string[];
      /** A finished calculation ends with "=". */
      finished: boolean;
    }
  | { kind: "message"; text: string };

/** Everything the machine shows. Components render it and nothing else. */
export interface MachineView {
  tape: readonly TapeEntry[];
  topLine: TopLine;
  digits: string;
  pressedKeys: readonly KeyId[];
  keyboardActive: boolean;
  soundOn: boolean;
}

/** Lines the tape shows; older lines are dropped. */
export const VISIBLE_TAPE_LINES = 4;

/** Digit cells on the display. A minus sign takes a cell; the point does not. */
export const DISPLAY_CELLS = 10;

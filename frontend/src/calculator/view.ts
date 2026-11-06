import type { Operation } from "./expression";
import type { KeyId } from "./keys";

/** One printed line of the tape. A null result is a failed calculation. */
export interface TapeEntry {
  /** Stable for the life of the line, so the newest line can be told apart. */
  id: number;
  operation: Operation;
  /** As shown on the display. */
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
  /** Read by screen readers when it changes: the last result or error. */
  announcement: string;
  /** Changes with every announcement, so repeating the same text is still announced. */
  announcementId: number;
}

/** Lines the tape shows. One more is kept while it feeds out of view. */
export const VISIBLE_TAPE_LINES = 4;

/** Digit cells on the display. A minus sign takes a cell; the point does not. */
export const DISPLAY_CELLS = 10;

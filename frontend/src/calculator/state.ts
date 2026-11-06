import type { BinaryOperation, Operation } from "./expression";
import type { KeyId } from "./keys";
import type { MessageId } from "./messages";
import type { TapeEntry } from "./view";

/**
 * The number being entered. Typed text can be unfinished ("0.", "-");
 * a computed value is a full-precision result from the API.
 */
export type Operand =
  { kind: "typed"; text: string } | { kind: "computed"; value: string };

/** What to do with a result when it arrives. */
export type Purpose =
  | { kind: "finish" }
  | { kind: "chain"; next: BinaryOperation }
  | { kind: "replaceOperand" };

export interface CalculationRequest {
  id: number;
  operation: Operation;
  operands: readonly string[];
  purpose: Purpose;
}

export interface CalculatorState {
  operand: Operand | null;
  /** The last finished result, which an operator continues from. */
  result: string | null;
  pending: { operation: BinaryOperation; left: string } | null;
  /** The finished calculation shown on the top line, ending with "=". */
  finished: { operation: Operation; operands: readonly string[] } | null;
  request: CalculationRequest | null;
  /** The request has taken long enough to show "Calculating...". */
  slow: boolean;
  /** Keys pressed while a request was in flight, applied when it ends. */
  queue: readonly KeyId[];
  message: MessageId | null;
  /** The display shows Error until a digit or AC. */
  error: boolean;
  tape: readonly TapeEntry[];
  announcement: string;
  nextId: number;
}

export const initialState: CalculatorState = {
  operand: null,
  result: null,
  pending: null,
  finished: null,
  request: null,
  slow: false,
  queue: [],
  message: null,
  error: false,
  tape: [],
  announcement: "",
  nextId: 1,
};

/** The operand as the API expects it: no trailing point, a lone minus is 0. */
export function operandValue(operand: Operand): string {
  if (operand.kind === "computed") return operand.value;
  const text = operand.text.replace(/\.$/, "");
  return text === "-" || text === "" ? "0" : text;
}

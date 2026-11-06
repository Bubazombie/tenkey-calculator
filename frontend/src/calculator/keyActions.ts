// What each key does to the calculator state. Pure: a key that needs the API
// sets state.request, and the outcome is applied later by applyOutcome.
import type { BinaryOperation, Operation } from "./expression";
import type { KeyAction } from "./keys";
import {
  type CalculatorState,
  initialState,
  type Operand,
  operandValue,
  type Purpose,
} from "./state";
import { appendDigit, appendPoint, removeLast } from "./typing";

function withRequest(
  state: CalculatorState,
  operation: Operation,
  operands: readonly string[],
  purpose: Purpose,
): CalculatorState {
  return {
    ...state,
    message: null,
    request: { id: state.nextId, operation, operands, purpose },
    slow: false,
    nextId: state.nextId + 1,
  };
}

/** Typing after a result or an error starts a new calculation; the tape stays. */
function startNewNumber(state: CalculatorState): CalculatorState {
  return state.error || (state.result !== null && state.pending === null)
    ? {
        ...initialState,
        tape: state.tape,
        nextId: state.nextId,
        announcement: state.announcement,
      }
    : { ...state, message: null };
}

function typedText(operand: Operand | null): string {
  return operand?.kind === "typed" ? operand.text : "";
}

function type(
  state: CalculatorState,
  edit: (text: string) => string,
): CalculatorState {
  const next = startNewNumber(state);
  return {
    ...next,
    finished: null,
    operand: { kind: "typed", text: edit(typedText(next.operand)) },
  };
}

/** A minus before any digit is a sign, unless it continues from a result. */
function isSignPosition(state: CalculatorState): boolean {
  const noDigits = state.operand === null || typedText(state.operand) === "-";
  return noDigits && (state.pending !== null || state.result === null);
}

function operator(
  state: CalculatorState,
  operation: BinaryOperation,
): CalculatorState {
  if (state.error) return state;
  const base = { ...state, message: null };

  if (operation === "subtract" && isSignPosition(base)) {
    const operand: Operand | null =
      typedText(base.operand) === "-" ? null : { kind: "typed", text: "-" };
    return { ...base, operand };
  }
  // Another operator after a lone minus replaces the pending one and drops the sign.
  const operand = typedText(base.operand) === "-" ? null : base.operand;

  if (operand && base.pending) {
    return withRequest(
      { ...base, operand },
      base.pending.operation,
      [base.pending.left, operandValue(operand)],
      { kind: "chain", next: operation },
    );
  }
  const left = operand
    ? operandValue(operand)
    : (base.pending?.left ?? base.result ?? "0");
  return {
    ...base,
    operand: null,
    result: null,
    finished: null,
    pending: { operation, left },
  };
}

function equals(state: CalculatorState): CalculatorState {
  if (state.error || !state.pending || !state.operand) return state;
  return withRequest(
    state,
    state.pending.operation,
    [state.pending.left, operandValue(state.operand)],
    {
      kind: "finish",
    },
  );
}

/** Percent and square root act on the current number. */
function unary(
  state: CalculatorState,
  operation: "percent" | "sqrt",
): CalculatorState {
  if (state.error) return state;
  const { pending, operand } = state;
  if (pending) {
    if (!operand) return state;
    const value = operandValue(operand);
    // Windows convention: a + b % and a − b % take b percent of a.
    const isPercentOf =
      operation === "percent" &&
      (pending.operation === "add" || pending.operation === "subtract");
    return isPercentOf
      ? withRequest(state, "percent_of", [pending.left, value], {
          kind: "replaceOperand",
        })
      : withRequest(state, operation, [value], { kind: "replaceOperand" });
  }
  const value = operand ? operandValue(operand) : (state.result ?? "0");
  return withRequest(state, operation, [value], { kind: "finish" });
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.operand?.kind !== "typed") return state;
  const text = removeLast(state.operand.text);
  return {
    ...state,
    message: null,
    operand: text === "" ? null : { kind: "typed", text },
  };
}

export function applyKey(
  state: CalculatorState,
  action: KeyAction,
): CalculatorState {
  const { retry } = state;
  if (retry && action.type === "equals") {
    // After no connection, = sends exactly the failed request again.
    return withRequest(
      { ...state, retry: null },
      retry.operation,
      retry.operands,
      retry.purpose,
    );
  }
  return applyKeyAction({ ...state, retry: null }, action);
}

function applyKeyAction(
  state: CalculatorState,
  action: KeyAction,
): CalculatorState {
  switch (action.type) {
    case "digit":
      return type(state, (text) => appendDigit(text, action.digit));
    case "point":
      return type(state, appendPoint);
    case "operator":
      return operator(state, action.operation);
    case "equals":
      return equals(state);
    case "percent":
      return unary(state, "percent");
    case "squareRoot":
      return unary(state, "sqrt");
    case "backspace":
      return backspace(state);
    case "clear":
      return { ...initialState, tape: state.tape, nextId: state.nextId };
  }
}

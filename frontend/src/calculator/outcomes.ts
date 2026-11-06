// Applying the API's answer to the calculator state.
import { formatForDisplay } from "./displayNumber";
import { spokenText, tapeLineParts } from "./expression";
import { messageForApiError, messages } from "./messages";
import type { CalculationRequest, CalculatorState } from "./state";
import { type TapeEntry, VISIBLE_TAPE_LINES } from "./view";

export type Outcome =
  | { kind: "result"; value: string }
  | { kind: "apiError"; code: string; status: number }
  | { kind: "noConnection" };

/** A value as the display shows it. Operands always fit; results are checked first. */
export function shown(value: string): string {
  const display = formatForDisplay(value);
  return display.kind === "number" ? display.text : value;
}

function print(
  state: CalculatorState,
  request: CalculationRequest,
  result: string | null,
) {
  const entry: TapeEntry = {
    id: state.nextId,
    operation: request.operation,
    operands: request.operands.map(shown),
    result,
  };
  // One extra line stays while it feeds out of view.
  const tape = [...state.tape, entry].slice(-(VISIBLE_TAPE_LINES + 1));
  const line = spokenText(
    tapeLineParts(entry.operation, entry.operands, entry.result),
  );
  return { tape, nextId: state.nextId + 1, line };
}

function failed(
  state: CalculatorState,
  request: CalculationRequest,
  message: keyof typeof messages,
) {
  const { tape, nextId, line } = print(state, request, null);
  return {
    ...state,
    tape,
    nextId,
    request: null,
    queue: [],
    operand: null,
    pending: null,
    result: null,
    finished: null,
    error: true,
    message,
    announcement: `${line}. ${messages[message]}`,
  };
}

/** Applies an outcome to the request it answers; answers to older requests are ignored. */
export function applyOutcome(
  state: CalculatorState,
  requestId: number,
  outcome: Outcome,
): CalculatorState {
  const { request } = state;
  if (request?.id !== requestId) return state;

  switch (outcome.kind) {
    case "noConnection":
      // Nothing changes, so pressing = sends the same calculation again.
      return {
        ...state,
        request: null,
        retry: request,
        queue: [],
        message: "noConnection",
        announcement: messages.noConnection,
      };
    case "apiError":
      return failed(
        state,
        request,
        messageForApiError(outcome.code, outcome.status),
      );
    case "result": {
      if (formatForDisplay(outcome.value).kind === "tooLarge") {
        return failed(state, request, "tooLargeToDisplay");
      }
      const { tape, nextId, line } = print(
        state,
        request,
        shown(outcome.value),
      );
      const next = {
        ...state,
        tape,
        nextId,
        request: null,
        announcement: line,
      };
      switch (request.purpose.kind) {
        case "finish":
          return {
            ...next,
            operand: null,
            pending: null,
            result: outcome.value,
            finished: {
              operation: request.operation,
              operands: request.operands.map(shown),
            },
          };
        case "chain":
          return {
            ...next,
            operand: null,
            result: null,
            finished: null,
            pending: { operation: request.purpose.next, left: outcome.value },
          };
        case "replaceOperand":
          return {
            ...next,
            operand: { kind: "computed", value: outcome.value },
          };
      }
    }
  }
}

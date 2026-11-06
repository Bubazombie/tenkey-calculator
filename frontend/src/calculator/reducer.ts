import { applyKey } from "./keyActions";
import { type KeyId, keyById } from "./keys";
import { applyOutcome, type Outcome } from "./outcomes";
import type { CalculatorState } from "./state";

export type CalculatorAction =
  | { type: "key"; key: KeyId }
  | { type: "outcome"; requestId: number; outcome: Outcome }
  | { type: "slow"; requestId: number };

/** Applies queued keys in order until one of them starts a new request. */
function drainQueue(state: CalculatorState): CalculatorState {
  let next: CalculatorState = { ...state, queue: [] };
  for (const [index, key] of state.queue.entries()) {
    if (next.request) return { ...next, queue: state.queue.slice(index) };
    next = applyKey(next, keyById(key).action);
  }
  return next;
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "key": {
      const { action: keyAction } = keyById(action.key);
      // AC always acts at once; other keys wait their turn while a request is in flight.
      if (state.request && keyAction.type !== "clear") {
        return { ...state, queue: [...state.queue, action.key] };
      }
      return applyKey(state, keyAction);
    }
    case "outcome":
      return drainQueue(applyOutcome(state, action.requestId, action.outcome));
    case "slow":
      return state.request?.id === action.requestId
        ? { ...state, slow: true }
        : state;
  }
}

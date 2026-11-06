import { useCallback, useEffect, useReducer } from "react";
import {
  type RequestCalculation,
  requestCalculation,
} from "../api/calculations";
import type { KeyId } from "./keys";
import { calculatorReducer } from "./reducer";
import { initialState } from "./state";

/** After this long without an answer, the display shows "Calculating...". */
export const SLOW_AFTER_MS = 400;
/** After this long without an answer, the request counts as no connection. */
export const TIMEOUT_MS = 10_000;

/** The calculator state, with each request sent to the API as it appears. */
export function useCalculator(
  request: RequestCalculation = requestCalculation,
) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const pending = state.request;

  useEffect(() => {
    if (!pending) return;
    const { id: requestId } = pending;
    const controller = new AbortController();
    const slow = setTimeout(() => {
      dispatch({ type: "slow", requestId });
    }, SLOW_AFTER_MS);
    const timeout = setTimeout(() => {
      controller.abort();
      dispatch({
        type: "outcome",
        requestId,
        outcome: { kind: "noConnection" },
      });
    }, TIMEOUT_MS);

    request(pending.operation, pending.operands, controller.signal)
      .then((outcome) => {
        dispatch({ type: "outcome", requestId, outcome });
      })
      .catch(() => {
        // Aborted: by AC, a newer request, the timeout or unmounting.
      })
      .finally(() => {
        clearTimeout(slow);
        clearTimeout(timeout);
      });

    // A request replaced or cleared by AC is cancelled.
    return () => {
      clearTimeout(slow);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [pending, request]);

  const press = useCallback((key: KeyId) => {
    dispatch({ type: "key", key });
  }, []);

  return { state, press };
}

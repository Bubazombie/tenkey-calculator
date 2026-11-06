import type { Operation } from "../calculator/expression";
import type { Outcome } from "../calculator/outcomes";

export const CALCULATIONS_URL = "/api/v1/calculations";

/** POST /api/v1/calculations request body. */
export interface CalculationRequestBody {
  operation: Operation;
  operands: readonly string[];
}

/** 200 response body. */
export interface CalculationResponseBody {
  result: string;
}

/** Error response body (RFC 9457 problem details with a code). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
}

export type RequestCalculation = (
  operation: Operation,
  operands: readonly string[],
  signal: AbortSignal,
) => Promise<Outcome>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isResponseBody = (value: unknown): value is CalculationResponseBody =>
  isObject(value) && typeof value.result === "string";

const isProblem = (value: unknown): value is Pick<ProblemDetails, "code"> =>
  isObject(value) && typeof value.code === "string";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

// A gateway between us and the API could not reach it.
const unreachableStatuses = new Set([502, 503, 504]);

/**
 * Sends one calculation. Every answer becomes an Outcome; only an abort
 * (AC, a timeout or unmounting) rejects, and the caller ignores it.
 */
export function createRequestCalculation(
  fetchFn: typeof fetch = fetch,
): RequestCalculation {
  return async (operation, operands, signal) => {
    const body: CalculationRequestBody = { operation, operands };
    let response: Response;
    try {
      response = await fetchFn(CALCULATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      return { kind: "noConnection" };
    }

    const data = await readJson(response);
    if (response.ok) {
      return isResponseBody(data)
        ? { kind: "result", value: data.result }
        : { kind: "apiError", code: "invalid_response", status: 500 };
    }
    if (unreachableStatuses.has(response.status))
      return { kind: "noConnection" };
    return {
      kind: "apiError",
      code: isProblem(data) ? data.code : "unknown",
      status: response.status,
    };
  };
}

export const requestCalculation = createRequestCalculation();

import { describe, expect, test, vi } from "vitest";
import { CALCULATIONS_URL, createRequestCalculation } from "./calculations";

const json = (status: number, body: unknown, type = "application/json") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": type },
  });

function clientReturning(response: Response | Error) {
  const fetchFn = vi.fn<typeof fetch>(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  );
  return { request: createRequestCalculation(fetchFn), fetchFn };
}

const signal = () => new AbortController().signal;

test("posts the operation and operands as JSON", async () => {
  const { request, fetchFn } = clientReturning(json(200, { result: "0.3" }));
  await request("add", ["0.1", "0.2"], signal());
  const [url, init] = fetchFn.mock.calls[0] ?? [];
  expect(url).toBe(CALCULATIONS_URL);
  expect(init?.method).toBe("POST");
  expect(init?.headers).toEqual({ "Content-Type": "application/json" });
  expect(init?.body).toBe('{"operation":"add","operands":["0.1","0.2"]}');
});

describe("outcomes", () => {
  test.each([
    [
      "a result",
      json(200, { result: "0.3" }),
      { kind: "result", value: "0.3" },
    ],
    [
      "a problem with a code",
      json(
        422,
        {
          type: "about:blank",
          title: "Unprocessable Entity",
          status: 422,
          code: "division_by_zero",
          detail: "x",
        },
        "application/problem+json",
      ),
      { kind: "apiError", code: "division_by_zero", status: 422 },
    ],
    [
      "a 500 without JSON",
      new Response("oops", { status: 500 }),
      { kind: "apiError", code: "unknown", status: 500 },
    ],
    [
      "a malformed result",
      json(200, { result: 3 }),
      { kind: "apiError", code: "invalid_response", status: 500 },
    ],
    [
      "a gateway that cannot reach the API",
      new Response("", { status: 502 }),
      { kind: "noConnection" },
    ],
    [
      "a gateway timeout",
      new Response("", { status: 504 }),
      { kind: "noConnection" },
    ],
    [
      "a network failure",
      new TypeError("Failed to fetch"),
      { kind: "noConnection" },
    ],
  ])("%s", async (_name, response, expected) => {
    const { request } = clientReturning(response);
    await expect(request("add", ["1", "2"], signal())).resolves.toEqual(
      expected,
    );
  });
});

test("an aborted request rejects, so the caller can ignore it", async () => {
  const controller = new AbortController();
  controller.abort();
  const { request } = clientReturning(
    new DOMException("aborted", "AbortError"),
  );
  await expect(request("add", ["1", "2"], controller.signal)).rejects.toThrow(
    "aborted",
  );
});

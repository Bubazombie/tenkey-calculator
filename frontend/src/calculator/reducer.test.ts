import { describe, expect, test } from "vitest";
import { type KeyId, keys } from "./keys";
import { messages } from "./messages";
import type { Outcome } from "./outcomes";
import { calculatorReducer } from "./reducer";
import { type CalculatorState, initialState } from "./state";
import { toView } from "./toView";
import { VISIBLE_TAPE_LINES } from "./view";

const keyForShortcut = new Map<string, KeyId>(
  keys.flatMap((key) =>
    key.shortcuts.map((shortcut) => [shortcut, key.id] as const),
  ),
);

/** Presses keys by their shortcut: "12*3=" or ["Backspace"]. */
function press(
  state: CalculatorState,
  input: string | string[],
): CalculatorState {
  const shortcuts = typeof input === "string" ? input.split("") : input;
  return shortcuts.reduce((current, shortcut) => {
    const key = keyForShortcut.get(shortcut);
    if (!key) throw new Error(`no key for ${shortcut}`);
    return calculatorReducer(current, { type: "key", key });
  }, state);
}

function answer(state: CalculatorState, outcome: Outcome): CalculatorState {
  if (!state.request) throw new Error("no request in flight");
  return calculatorReducer(state, {
    type: "outcome",
    requestId: state.request.id,
    outcome,
  });
}

const result = (value: string): Outcome => ({ kind: "result", value });
const view = (state: CalculatorState) =>
  toView(state, { pressedKeys: [], keyboardActive: true, soundOn: true });
const request = (state: CalculatorState) =>
  state.request && {
    operation: state.request.operation,
    operands: state.request.operands,
  };

describe("typing", () => {
  test("digits appear on the display", () => {
    expect(view(press(initialState, "12.5")).digits).toBe("12.5");
  });

  test("backspace removes the last character, and does nothing to a result", () => {
    expect(view(press(initialState, ["1", "2", ".", "Backspace"])).digits).toBe(
      "12",
    );
    const finished = answer(press(initialState, "2*3="), result("6"));
    expect(view(press(finished, ["Backspace"])).digits).toBe("6");
  });

  test("a trailing point is not sent to the API", () => {
    expect(request(press(initialState, "5.*2="))).toEqual({
      operation: "multiply",
      operands: ["5", "2"],
    });
  });
});

describe("calculating", () => {
  test("12 × 3 = 36 shows the result, the finished expression and a tape line", () => {
    let state = press(initialState, "12*");
    expect(view(state).topLine).toEqual({
      kind: "expression",
      operation: "multiply",
      operands: ["12"],
      finished: false,
    });
    expect(view(state).digits).toBe("12");
    state = press(state, "3=");
    expect(request(state)).toEqual({
      operation: "multiply",
      operands: ["12", "3"],
    });
    state = answer(state, result("36"));
    expect(view(state).digits).toBe("36");
    expect(view(state).topLine).toEqual({
      kind: "expression",
      operation: "multiply",
      operands: ["12", "3"],
      finished: true,
    });
    expect(state.tape).toMatchObject([
      { operation: "multiply", operands: ["12", "3"], result: "36" },
    ]);
    expect(state.announcement).toBe("12 × 3 = 36");
  });

  test("operations chain left to right: 2 + 3 × computes 5 first", () => {
    let state = press(initialState, "2+3*");
    expect(request(state)).toEqual({ operation: "add", operands: ["2", "3"] });
    state = answer(state, result("5"));
    expect(view(state).topLine).toMatchObject({
      operation: "multiply",
      operands: ["5"],
      finished: false,
    });
    expect(request(press(state, "4="))).toEqual({
      operation: "multiply",
      operands: ["5", "4"],
    });
  });

  test("results keep full precision for chaining and are rounded only for display", () => {
    const third = "0.3333333333333333333333333333333333";
    const state = answer(press(initialState, "1/3*"), result(third));
    expect(view(state).digits).toBe("0.333333333");
    expect(request(press(state, "3="))).toEqual({
      operation: "multiply",
      operands: [third, "3"],
    });
  });

  test("a second operator replaces the pending one", () => {
    expect(press(initialState, "5+*").pending).toEqual({
      operation: "multiply",
      left: "5",
    });
  });

  test("= after a result does nothing", () => {
    const state = answer(press(initialState, "2*3="), result("6"));
    expect(press(state, "=")).toEqual(state);
  });

  test("a digit after a result starts a new number; the tape stays", () => {
    const state = press(answer(press(initialState, "2*3="), result("6")), "7");
    expect(view(state).digits).toBe("7");
    expect(view(state).topLine).toEqual({ kind: "empty" });
    expect(state.tape).toHaveLength(1);
  });

  test("an operator after a result continues from it", () => {
    const state = press(answer(press(initialState, "2*3="), result("6")), "-");
    expect(state.pending).toEqual({ operation: "subtract", left: "6" });
  });

  test("AC clears everything but the tape", () => {
    const state = press(
      answer(press(initialState, "2*3="), result("6")),
      "5+1",
    );
    const cleared = press(state, ["Escape"]);
    expect(view(cleared).digits).toBe("0");
    expect(view(cleared).topLine).toEqual({ kind: "empty" });
    expect(cleared.tape).toHaveLength(1);
  });
});

describe("negative numbers", () => {
  test("a minus before any digit is a sign", () => {
    expect(view(press(initialState, "-5")).digits).toBe("-5");
    expect(view(press(initialState, "5*-3")).digits).toBe("-3");
  });

  test("a second minus removes the sign", () => {
    expect(press(initialState, "5*--").operand).toBeNull();
  });

  test("another operator replaces the pending one and drops the sign", () => {
    const state = press(initialState, "5*-+");
    expect(state.operand).toBeNull();
    expect(state.pending).toEqual({ operation: "add", left: "5" });
  });
});

describe("percent and square root", () => {
  test("a + b % takes b percent of a, then = adds it", () => {
    let state = press(initialState, "200+10%");
    expect(request(state)).toEqual({
      operation: "percent_of",
      operands: ["200", "10"],
    });
    state = answer(state, result("20"));
    expect(view(state).digits).toBe("20");
    expect(view(state).topLine).toMatchObject({
      operation: "add",
      operands: ["200"],
    });
    expect(request(press(state, "="))).toEqual({
      operation: "add",
      operands: ["200", "20"],
    });
  });

  test("a × b % turns b into b / 100", () => {
    expect(request(press(initialState, "8*50%"))).toEqual({
      operation: "percent",
      operands: ["50"],
    });
  });

  test("a lone percent finishes: 50 % = 0.5", () => {
    const state = answer(press(initialState, "50%"), result("0.5"));
    expect(view(state).topLine).toEqual({
      kind: "expression",
      operation: "percent",
      operands: ["50"],
      finished: true,
    });
  });

  test("square root replaces the operand inside a pending operation", () => {
    const state = answer(press(initialState, "2+9@"), result("3"));
    expect(view(state).digits).toBe("3");
    expect(request(press(state, "="))).toEqual({
      operation: "add",
      operands: ["2", "3"],
    });
  });
});

describe("failures", () => {
  test("an API error shows its message, prints ERROR and recovers with a digit", () => {
    let state = answer(press(initialState, "8/0="), {
      kind: "apiError",
      code: "division_by_zero",
      status: 422,
    });
    expect(view(state).digits).toBe("Error");
    expect(view(state).topLine).toEqual({
      kind: "message",
      text: messages.divisionByZero,
    });
    expect(state.tape.at(-1)).toMatchObject({
      operands: ["8", "0"],
      result: null,
    });
    expect(state.announcement).toBe(
      `8 ÷ 0 = ERROR. ${messages.divisionByZero}`,
    );
    expect(press(state, "+")).toEqual(state);
    state = press(state, "7");
    expect(view(state).digits).toBe("7");
    expect(view(state).topLine).toEqual({ kind: "empty" });
  });

  test("a result too large to display is an error", () => {
    const state = answer(
      press(initialState, "100000*100000="),
      result("10000000000"),
    );
    expect(view(state).digits).toBe("Error");
    expect(view(state).topLine).toEqual({
      kind: "message",
      text: messages.tooLargeToDisplay,
    });
    expect(state.tape.at(-1)?.result).toBeNull();
  });

  test("no connection keeps the calculation, and = sends it again", () => {
    const state = answer(press(initialState, "12*3="), {
      kind: "noConnection",
    });
    expect(view(state).digits).toBe("3");
    expect(view(state).topLine).toEqual({
      kind: "message",
      text: messages.noConnection,
    });
    expect(request(press(state, "="))).toEqual({
      operation: "multiply",
      operands: ["12", "3"],
    });
  });

  test.each([
    ["a square root", "9@", { operation: "sqrt", operands: ["9"] }],
    ["a lone percent", "50%", { operation: "percent", operands: ["50"] }],
    [
      "a percent inside a pending operation",
      "200+10%",
      { operation: "percent_of", operands: ["200", "10"] },
    ],
    [
      "an operator that chains",
      "2+3*",
      { operation: "add", operands: ["2", "3"] },
    ],
  ])("after no connection, = resends %s exactly", (_name, keys, expected) => {
    const failed = answer(press(initialState, keys), { kind: "noConnection" });
    const retried = press(failed, "=");
    expect(request(retried)).toEqual(expected);
    expect(retried.request?.purpose).toEqual(failed.retry?.purpose);
  });

  test("a retried percent still replaces the operand", () => {
    let state = answer(press(initialState, "200+10%"), {
      kind: "noConnection",
    });
    state = answer(press(state, "="), result("20"));
    expect(view(state).digits).toBe("20");
    expect(request(press(state, "="))).toEqual({
      operation: "add",
      operands: ["200", "20"],
    });
  });

  test("any other key drops the failed request", () => {
    const failed = answer(press(initialState, "9@"), { kind: "noConnection" });
    const state = press(failed, "4");
    expect(state.retry).toBeNull();
    expect(view(state).topLine).toEqual({ kind: "empty" });
    expect(press(state, "=").request).toBeNull();
  });

  test("a server error keeps the calculation, and = sends it again", () => {
    const failed = answer(press(initialState, "9@"), {
      kind: "apiError",
      code: "internal",
      status: 500,
    });
    expect(view(failed).topLine).toEqual({
      kind: "message",
      text: messages.serverError,
    });
    expect(view(failed).digits).toBe("9");
    expect(failed.tape).toEqual([]);
    expect(request(press(failed, "="))).toEqual({
      operation: "sqrt",
      operands: ["9"],
    });
  });

  test.each(["5+-=", "9+-@", "9+-%"])(
    "%s does nothing while only a minus sign is typed",
    (keys) => {
      expect(press(initialState, keys).request).toBeNull();
    },
  );

  test("a slow request shows Calculating...", () => {
    let state = press(initialState, "12*3=");
    const id = state.request?.id ?? 0;
    state = calculatorReducer(state, { type: "slow", requestId: id });
    expect(view(state).topLine).toEqual({
      kind: "message",
      text: messages.calculating,
    });
  });
});

describe("keys pressed during a request", () => {
  test("are queued and applied in order when the answer arrives", () => {
    let state = press(initialState, "2+3*4=");
    expect(state.queue).toEqual(["digit4", "equals"]);
    state = answer(state, result("5"));
    expect(request(state)).toEqual({
      operation: "multiply",
      operands: ["5", "4"],
    });
    expect(state.queue).toEqual([]);
  });

  test("stay queued behind a new request", () => {
    let state = press(initialState, "1+2+3+4=");
    state = answer(state, result("3"));
    expect(request(state)).toEqual({ operation: "add", operands: ["3", "3"] });
    expect(state.queue).toEqual(["digit4", "equals"]);
  });

  test("are dropped by an error", () => {
    const state = answer(press(initialState, "8/0=+5"), {
      kind: "apiError",
      code: "division_by_zero",
      status: 422,
    });
    expect(state.queue).toEqual([]);
    expect(view(state).digits).toBe("Error");
  });

  test("AC cancels the request and the queue, and a late answer is ignored", () => {
    const busy = press(initialState, "2+3*4");
    const id = busy.request?.id ?? 0;
    const cleared = press(busy, ["Escape"]);
    expect(cleared.request).toBeNull();
    expect(cleared.queue).toEqual([]);
    expect(
      calculatorReducer(cleared, {
        type: "outcome",
        requestId: id,
        outcome: result("5"),
      }),
    ).toEqual(cleared);
  });
});

test("the tape keeps one line more than it shows, with stable ids", () => {
  let state = initialState;
  const ids: number[] = [];
  for (let i = 0; i < 7; i++) {
    state = answer(press(state, "1+1="), result("2"));
    ids.push(state.tape.at(-1)?.id ?? 0);
  }
  expect(state.tape).toHaveLength(VISIBLE_TAPE_LINES + 1);
  expect(state.tape.map((line) => line.id)).toEqual(
    ids.slice(-(VISIBLE_TAPE_LINES + 1)),
  );
  expect(new Set(ids).size).toBe(ids.length);
});

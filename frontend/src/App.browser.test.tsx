import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { RequestCalculation } from "./api/calculations";
import { App } from "./App";
import type { Operation } from "./calculator/expression";
import { messages } from "./calculator/messages";
import type { Outcome } from "./calculator/outcomes";
import { TIMEOUT_MS } from "./calculator/useCalculator";
import type { SoundPlayer } from "./sound/soundPlayer";
import "./styles/global.css";
import { expectNoAxeViolations } from "./test/axe";

interface Call {
  operation: Operation;
  operands: readonly string[];
  signal: AbortSignal;
  answer: (outcome: Outcome) => void;
}

/** A fake API: each call waits until the test answers it. */
function fakeApi() {
  const calls: Call[] = [];
  const request: RequestCalculation = (operation, operands, signal) =>
    new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
      calls.push({ operation, operands, signal, answer: resolve });
    });
  const answer = async (outcome: Outcome) => {
    await vi.waitFor(() => {
      if (calls.length === 0) throw new Error("no call yet");
    });
    const call = calls.shift();
    call?.answer(outcome);
    return call;
  };
  return { request, calls, answer };
}

function silentPlayer() {
  const press = vi.fn<SoundPlayer["press"]>();
  const release = vi.fn<SoundPlayer["release"]>();
  const player: SoundPlayer = { load: () => Promise.resolve(), press, release };
  return { player, press, release };
}

async function setup() {
  const api = fakeApi();
  const { player, press, release } = silentPlayer();
  const screen = await render(
    <App requestCalculation={api.request} createSoundPlayer={() => player} />,
  );
  const machine = screen.getByRole("group", {
    name: "Tenkey printing calculator",
  });
  machine.element().focus();
  const display = () =>
    machine.element().querySelector("p:last-of-type span:last-child")
      ?.textContent;
  const topLine = () => machine.element().querySelector("p")?.textContent;
  return { screen, api, machine, display, topLine, press, release };
}

const result = (value: string): Outcome => ({ kind: "result", value });

afterEach(() => {
  vi.useRealTimers();
});

describe("full flows", () => {
  test("type, calculate, print and announce", async () => {
    const { api, screen, display } = await setup();
    await userEvent.keyboard("12*3{Enter}");
    const call = await api.answer(result("36"));
    expect(call).toMatchObject({
      operation: "multiply",
      operands: ["12", "3"],
    });
    await vi.waitFor(() => {
      expect(display()).toBe("36");
    });
    await expect
      .element(screen.getByRole("listitem"))
      .toHaveTextContent("12 × 3 = 36");
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("12 × 3 = 36");
    await expectNoAxeViolations(screen.container);
  });

  test("an API error shows its message, and typing recovers", async () => {
    const { api, screen, display } = await setup();
    await userEvent.keyboard("8/0=");
    await api.answer({
      kind: "apiError",
      code: "division_by_zero",
      status: 422,
    });
    await expect
      .element(screen.getByText(messages.divisionByZero))
      .toBeVisible();
    expect(display()).toBe("Error");
    await expect
      .element(screen.getByRole("listitem"))
      .toHaveTextContent("8 ÷ 0 = ERROR");
    await expectNoAxeViolations(screen.container);
    await userEvent.keyboard("7");
    expect(display()).toBe("7");
    await expect
      .element(screen.getByText(messages.divisionByZero))
      .not.toBeInTheDocument();
  });

  test("no connection keeps the calculation, and = tries again", async () => {
    const { api, display, topLine } = await setup();
    await userEvent.keyboard("12*3=");
    await api.answer({ kind: "noConnection" });
    await vi.waitFor(() => {
      expect(topLine()).toBe(messages.noConnection);
    });
    expect(display()).toBe("3");
    await userEvent.keyboard("=");
    const retry = await api.answer(result("36"));
    expect(retry?.operands).toEqual(["12", "3"]);
    await vi.waitFor(() => {
      expect(display()).toBe("36");
    });
  });

  test("a slow answer shows Calculating... until it arrives", async () => {
    const { api, screen, display } = await setup();
    await userEvent.keyboard("2+2=");
    await expect.element(screen.getByText(messages.calculating)).toBeVisible();
    await api.answer(result("4"));
    await vi.waitFor(() => {
      expect(display()).toBe("4");
    });
    await expect
      .element(screen.getByText(messages.calculating))
      .not.toBeInTheDocument();
  });

  test("keys typed while waiting are applied in order", async () => {
    const { api, display } = await setup();
    await userEvent.keyboard("2+3*4=");
    const first = await api.answer(result("5"));
    expect(first?.operands).toEqual(["2", "3"]);
    const second = await api.answer(result("20"));
    expect(second).toMatchObject({
      operation: "multiply",
      operands: ["5", "4"],
    });
    await vi.waitFor(() => {
      expect(display()).toBe("20");
    });
  });

  test("AC cancels the request in flight", async () => {
    const { api, display } = await setup();
    await userEvent.keyboard("2+3*");
    await vi.waitFor(() => {
      expect(api.calls).toHaveLength(1);
    });
    const [call] = api.calls;
    await userEvent.keyboard("{Escape}");
    expect(call?.signal.aborted).toBe(true);
    expect(display()).toBe("0");
  });

  test("no answer within the time limit counts as no connection", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { api, topLine } = await setup();
    await userEvent.keyboard("1+1=");
    await vi.waitFor(() => {
      expect(api.calls).toHaveLength(1);
    });
    vi.advanceTimersByTime(TIMEOUT_MS);
    await vi.waitFor(() => {
      expect(topLine()).toBe(messages.noConnection);
    });
    expect(api.calls[0]?.signal.aborted).toBe(true);
  });
});

describe("sound", () => {
  test("keys sound while the switch is on, and are silent when it is off", async () => {
    const { screen, press, release } = await setup();
    await userEvent.keyboard("7");
    expect(press).toHaveBeenCalledWith("regular");
    expect(release).toHaveBeenCalledWith("regular");
    const toggle = screen.getByRole("switch", { name: "Sound" });
    await userEvent.click(toggle);
    await expect.element(toggle).not.toBeChecked();
    press.mockClear();
    await userEvent.keyboard("8");
    expect(press).not.toHaveBeenCalled();
  });

  test("wide keys and equals use their own recordings", async () => {
    const { press } = await setup();
    await userEvent.keyboard("0+=");
    expect(press.mock.calls).toEqual([["wide"], ["wide"], ["enter"]]);
  });
});

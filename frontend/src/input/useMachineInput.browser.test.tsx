import { beforeEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { KeyId } from "../calculator/keys";
import { Machine } from "../components/Machine";
import { fixtures } from "../fixtures/fixtures";
import "../styles/global.css";
import { useMachineInput } from "./useMachineInput";

const onPress = vi.fn<(key: KeyId) => void>();
const onKeyDown = vi.fn<(key: KeyId) => void>();
const onKeyUp = vi.fn<(key: KeyId) => void>();

function Harness() {
  const input = useMachineInput({ onPress, onKeyDown, onKeyUp });
  return (
    <>
      <button type="button">Outside</button>
      <Machine
        view={{
          ...fixtures.fresh,
          pressedKeys: input.pressedKeys,
          keyboardActive: input.keyboardActive,
        }}
        handlers={input.handlers}
      />
    </>
  );
}

async function setup() {
  const screen = await render(<Harness />);
  const machine = screen.getByRole("group", {
    name: "Tenkey printing calculator",
  });
  const key = (name: string) =>
    screen.getByRole("button", { name, exact: true });
  return { screen, machine, key };
}

/** A synthetic key event: browsers never run their default action for it. */
function keydown(
  target: Element,
  init: KeyboardEventInit & { modifierAltGraph?: boolean },
) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

const pressed = () => onPress.mock.calls.map(([key]) => key);

beforeEach(() => {
  onPress.mockClear();
  onKeyDown.mockClear();
  onKeyUp.mockClear();
});

describe("keyboard", () => {
  test("shortcuts press keys while the machine has focus", async () => {
    const { machine } = await setup();
    machine.element().focus();
    await userEvent.keyboard("12+{Enter}");
    expect(pressed()).toEqual(["digit1", "digit2", "add", "equals"]);
  });

  test("shortcuts do nothing while focus is outside the machine", async () => {
    const { screen } = await setup();
    screen.getByRole("button", { name: "Outside" }).element().focus();
    await userEvent.keyboard("7");
    expect(pressed()).toEqual([]);
  });

  test.each([
    { key: "r", ctrlKey: true },
    { key: "c", ctrlKey: true },
    { key: "r", metaKey: true },
    { key: "y", altKey: true },
  ])("browser shortcut %o is left to the browser", async (init) => {
    const { machine } = await setup();
    const event = keydown(machine.element(), init);
    expect(event.defaultPrevented).toBe(false);
    expect(pressed()).toEqual([]);
  });

  test("characters typed with AltGr still work", async () => {
    const { machine } = await setup();
    // AltGr arrives as Ctrl+Alt on Windows, for example @ on a Spanish layout.
    keydown(machine.element(), {
      key: "@",
      ctrlKey: true,
      altKey: true,
      modifierAltGraph: true,
    });
    expect(pressed()).toEqual(["squareRoot"]);
  });

  test("a held key goes down once and comes back up on release", async () => {
    const { machine, key } = await setup();
    machine.element().focus();
    await userEvent.keyboard("{7>}");
    keydown(machine.element(), { key: "7", repeat: true });
    await expect.element(key("7")).toHaveAttribute("data-pressed", "true");
    await userEvent.keyboard("{/7}");
    await expect.element(key("7")).toHaveAttribute("data-pressed", "false");
    expect(pressed()).toEqual(["digit7"]);
    expect(onKeyDown.mock.calls).toEqual([["digit7"]]);
    expect(onKeyUp.mock.calls).toEqual([["digit7"]]);
  });

  test.each(["{Enter}", " "])(
    "%s on a focused key presses that key",
    async (keys) => {
      const { key } = await setup();
      key("7").element().focus();
      await userEvent.keyboard(keys);
      expect(pressed()).toEqual(["digit7"]);
      expect(onKeyDown.mock.calls).toEqual([["digit7"]]);
    },
  );
});

describe("pointer", () => {
  test("a click presses the key and keeps focus on the machine", async () => {
    const { machine, key, screen } = await setup();
    await userEvent.click(key("7"));
    expect(pressed()).toEqual(["digit7"]);
    await expect.element(machine).toHaveFocus();
    await expect
      .element(screen.getByRole("img", { name: "Keyboard shortcuts on" }))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");
    expect(pressed()).toEqual(["digit7", "equals"]);
  });

  test("a click does not draw the keyboard focus ring; Tab does", async () => {
    const { machine, key, screen } = await setup();
    await userEvent.click(key("7"));
    await expect.element(machine).toHaveFocus();
    expect(machine.element().matches(":focus-visible")).toBe(false);
    screen.getByRole("button", { name: "Outside" }).element().focus();
    await userEvent.tab();
    await expect.element(machine).toHaveFocus();
    expect(machine.element().matches(":focus-visible")).toBe(true);
  });

  test("pressing down only moves the key; the action waits for the click (WCAG 2.5.2)", async () => {
    const { key } = await setup();
    const button = key("7").element();
    button.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    await expect.element(key("7")).toHaveAttribute("data-pressed", "true");
    expect(pressed()).toEqual([]);
    expect(onKeyDown.mock.calls).toEqual([["digit7"]]);
    button.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    await expect.element(key("7")).toHaveAttribute("data-pressed", "false");
    expect(pressed()).toEqual([]);
  });
});

test("the keyboard light is on only while the machine has focus", async () => {
  const { machine, screen } = await setup();
  await expect
    .element(screen.getByRole("img", { name: "Keyboard shortcuts off" }))
    .toBeVisible();
  machine.element().focus();
  await expect
    .element(screen.getByRole("img", { name: "Keyboard shortcuts on" }))
    .toBeVisible();
  screen.getByRole("button", { name: "Outside" }).element().focus();
  await expect
    .element(screen.getByRole("img", { name: "Keyboard shortcuts off" }))
    .toBeVisible();
});

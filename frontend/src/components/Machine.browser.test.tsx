import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { keys } from "../calculator/keys";
import { shortcutHelp } from "../calculator/shortcuts";
import { fixtureNames, fixtures } from "../fixtures/fixtures";
import "../styles/global.css";
import { expectNoAxeViolations } from "../test/axe";
import { Machine } from "./Machine";

const keyButtons = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-key]"));

describe("every fixture", () => {
  test.each(fixtureNames)("%s has no WCAG violations", async (name) => {
    const screen = await render(<Machine view={fixtures[name]} />);
    await expectNoAxeViolations(screen.container);
  });
});

describe("keys", () => {
  test("have these accessible names, in Tab order", async () => {
    const screen = await render(<Machine view={fixtures.fresh} />);
    const names = keyButtons(screen.container).map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(names).toEqual([
      "Square root",
      "xy, power",
      "Percent",
      "Backspace",
      "AC, clear all",
      "Divided by",
      "Times",
      "Minus",
      "7",
      "8",
      "9",
      "Plus",
      "4",
      "5",
      "6",
      "1",
      "2",
      "3",
      "0",
      "Decimal point",
      "Equals",
    ]);
  });

  test("expose their shortcuts", async () => {
    const screen = await render(<Machine view={fixtures.fresh} />);
    await expect
      .element(screen.getByRole("button", { name: "Equals" }))
      .toHaveAttribute("aria-keyshortcuts", "Enter =");
    for (const button of keyButtons(screen.container)) {
      expect(
        button.getAttribute("aria-keyshortcuts"),
        button.dataset.key,
      ).toMatch(/\S/);
    }
  });

  test("show the pressed state from the view", async () => {
    const screen = await render(<Machine view={fixtures.reference} />);
    const pressed = keyButtons(screen.container).filter(
      (b) => b.dataset.pressed === "true",
    );
    expect(pressed.map((b) => b.dataset.key)).toEqual(["digit5"]);
  });
});

describe("machine", () => {
  test("is a focusable group described by the shortcut help", async () => {
    const screen = await render(<Machine view={fixtures.fresh} />);
    const machine = screen.getByRole("group", {
      name: "Tenkey printing calculator",
    });
    await expect.element(machine).toHaveAttribute("tabindex", "0");
    await expect
      .element(machine)
      .toHaveAccessibleDescription(shortcutHelp(keys));
  });

  test("has an empty polite live region for results and errors", async () => {
    const screen = await render(<Machine view={fixtures.fresh} />);
    const status = screen.getByRole("status");
    await expect.element(status).toHaveAttribute("aria-live", "polite");
    await expect.element(status).toBeEmptyDOMElement();
  });

  test("repeating the same announcement replaces the text, so it is read again", async () => {
    const view = {
      ...fixtures.fresh,
      announcement: "2 + 2 = 4",
      announcementId: 1,
    };
    const screen = await render(<Machine view={view} />);
    const status = screen.getByRole("status").element();
    const first = status.firstChild;
    await screen.rerender(<Machine view={{ ...view, announcementId: 2 }} />);
    expect(status.textContent).toBe("2 + 2 = 4");
    expect(status.firstChild).not.toBe(first);
  });

  test("shows the keyboard light and the sound switch state", async () => {
    const on = await render(<Machine view={fixtures.reference} />);
    await expect
      .element(on.getByRole("img", { name: "Keyboard shortcuts on" }))
      .toBeVisible();
    await expect
      .element(on.getByRole("switch", { name: "Sound" }))
      .toBeChecked();
    await on.unmount();

    const off = await render(<Machine view={fixtures.quiet} />);
    await expect
      .element(off.getByRole("img", { name: "Keyboard shortcuts off" }))
      .toBeVisible();
    await expect
      .element(off.getByRole("switch", { name: "Sound" }))
      .not.toBeChecked();
  });
});

/** The text assistive technology reads: everything except aria-hidden content. */
function readText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
    hidden.remove();
  });
  return copy.textContent.replace(/\s+/g, " ").trim();
}

describe("tape", () => {
  test("is a list with one item per line, read in words", async () => {
    const screen = await render(<Machine view={fixtures.reference} />);
    const list = screen.getByRole("list", { name: "Tape" });
    await expect.element(list).toBeInTheDocument();
    const items = Array.from(list.element().children);
    expect(items.map(readText)).toEqual([
      "0.1 + 0.2 = 0.3",
      "8 ÷ 0 = ERROR",
      "square root of 144 = 12",
      "2 to the power of 10 = 1024",
    ]);
  });
});

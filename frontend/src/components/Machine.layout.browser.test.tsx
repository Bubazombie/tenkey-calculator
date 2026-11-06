import { afterEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../calculator/messages";
import type { MachineView } from "../calculator/view";
import { fixtureNames, fixtures } from "../fixtures/fixtures";
import "../styles/global.css";
import { Machine } from "./Machine";

// 320x568 gives the narrowest machine the design allows: 254px.
const narrowest = { width: 320, height: 568 };

afterEach(async () => {
  await page.viewport(narrowest.width, narrowest.height);
});

async function renderAt(view: MachineView, width: number, height: number) {
  await page.viewport(width, height);
  const screen = await render(<Machine view={view} />);
  await document.fonts.ready;
  return screen;
}

const machineOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[role="group"]');

describe("at the narrowest width", () => {
  test("the machine is 254px wide", async () => {
    const screen = await renderAt(
      fixtures.reference,
      narrowest.width,
      narrowest.height,
    );
    expect(
      machineOf(screen.container)?.getBoundingClientRect().width,
    ).toBeCloseTo(254, 0);
  });

  test.each(Object.entries(messages))(
    "the %s message fits the two reserved lines",
    async (_id, text) => {
      const view: MachineView = {
        ...fixtures.reference,
        topLine: { kind: "message", text },
      };
      const screen = await renderAt(view, narrowest.width, narrowest.height);
      const line = screen.getByText(text).element().closest("p");
      const content = line?.firstElementChild;
      if (!line || !content) throw new Error("top line not found");
      expect(content.getBoundingClientRect().height).toBeLessThanOrEqual(
        line.getBoundingClientRect().height + 0.5,
      );
    },
  );

  test("tape lines break only at spaces, never inside a number", async () => {
    const screen = await renderAt(
      fixtures["long-tape"],
      narrowest.width,
      narrowest.height,
    );
    const tape = screen.getByRole("list", { name: "Tape" }).element();
    const numbers = Array.from(tape.querySelectorAll("li span")).filter(
      (span) => /^[−]?[0-9.]+$/.test(span.textContent),
    );
    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) {
      expect(number.getClientRects(), number.textContent).toHaveLength(1);
    }
    // The longest line really wraps, so the check above is meaningful.
    const first = tape.querySelector("li");
    expect(first?.getClientRects().length ?? 0).toBeGreaterThan(0);
    expect(first?.getBoundingClientRect().height ?? 0).toBeGreaterThan(
      parseFloat(getComputedStyle(first ?? tape).lineHeight) * 1.5,
    );
  });

  test("every key is at least 24 by 24 pixels (WCAG 2.5.8)", async () => {
    const screen = await renderAt(
      fixtures.fresh,
      narrowest.width,
      narrowest.height,
    );
    for (const button of screen.container.querySelectorAll("button")) {
      const { width, height } = button.getBoundingClientRect();
      expect(
        width,
        button.getAttribute("aria-label") ?? "",
      ).toBeGreaterThanOrEqual(24);
      expect(
        height,
        button.getAttribute("aria-label") ?? "",
      ).toBeGreaterThanOrEqual(24);
    }
  });
});

describe("the whole machine fits the screen", () => {
  test.each([
    [375, 667],
    [390, 844],
    [1280, 860],
    [1920, 1080],
  ])("at %ix%i", async (width, height) => {
    const screen = await renderAt(fixtures.reference, width, height);
    const box = machineOf(screen.container)?.getBoundingClientRect();
    // 22px of page padding above the machine.
    expect((box?.bottom ?? Infinity) + 22).toBeLessThanOrEqual(height);
    expect(box?.width ?? 0).toBeLessThanOrEqual(480);
  });
});

test.each(fixtureNames)("%s keeps the display height fixed", async (name) => {
  const reference = await renderAt(
    fixtures.reference,
    narrowest.width,
    narrowest.height,
  );
  const expected = reference
    .getByText("Tenkey")
    .element()
    .getBoundingClientRect().top;
  await reference.unmount();
  const screen = await renderAt(
    fixtures[name],
    narrowest.width,
    narrowest.height,
  );
  // The label plate sits right under the display, so its position shows any shift.
  expect(
    screen.getByText("Tenkey").element().getBoundingClientRect().top,
  ).toBeCloseTo(expected, 1);
});

import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { App } from "./App";
import { expectNoAxeViolations } from "./test/axe";

test("shows the calculator name as the page heading", async () => {
  const screen = await render(<App />);
  await expect
    .element(screen.getByRole("heading", { level: 1, name: "Tenkey" }))
    .toBeVisible();
});

test("has no WCAG violations", async () => {
  const screen = await render(<App />);
  await expectNoAxeViolations(screen.container);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** The parts of the calculator the end-to-end tests read. */
export function calculator(page: Page) {
  const machine = page.getByRole("group", {
    name: "Tenkey printing calculator",
  });
  return {
    machine,
    key: (name: string) => page.getByRole("button", { name, exact: true }),
    topLine: machine.locator("p").first(),
    digits: machine.locator("p").nth(1).locator("span").last(),
    tape: page.getByRole("list", { name: "Tape" }),
  };
}

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

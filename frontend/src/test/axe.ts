import axe from "axe-core";
import { expect } from "vitest";

// WCAG 2.2 A and AA, the level this project commits to.
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function expectNoAxeViolations(element: Element): Promise<void> {
  const results = await axe.run(element, {
    runOnly: { type: "tag", values: wcagTags },
  });
  const violations = results.violations.map((violation) => {
    const targets = violation.nodes
      .map((node) => node.target.join(" "))
      .join(", ");
    return `${violation.id}: ${violation.help} (${targets})`;
  });
  expect(violations).toEqual([]);
}

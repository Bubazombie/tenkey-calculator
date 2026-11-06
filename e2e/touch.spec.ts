import { expect, test } from "@playwright/test";
import { calculator, expectNoAxeViolations } from "./calculator";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("every key is at least 44 by 44 pixels on a touch screen", async ({
  page,
}) => {
  const keys = calculator(page).machine.locator("button[data-key]");
  await expect(keys).toHaveCount(21);
  for (const key of await keys.all()) {
    const box = await key.boundingBox();
    const name = (await key.getAttribute("aria-label")) ?? "";
    expect(box?.width, name).toBeGreaterThanOrEqual(44);
    expect(box?.height, name).toBeGreaterThanOrEqual(44);
  }
});

test("a calculation by tapping, with every key on screen", async ({ page }) => {
  const { key, digits, machine } = calculator(page);
  const box = await machine.boundingBox();
  expect((box?.y ?? 0) + (box?.height ?? Infinity)).toBeLessThanOrEqual(667);
  for (const name of ["7", "Plus", "8", "Equals"]) await key(name).tap();
  await expect(digits).toHaveText("15");
  await expectNoAxeViolations(page);
});

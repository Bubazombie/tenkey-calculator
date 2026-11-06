import { expect, test } from "@playwright/test";
import { calculator, expectNoAxeViolations } from "./calculator";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the page loads with no failed request and no console error", async ({
  browser,
}) => {
  const page = await browser.newPage();
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      problems.push(`${String(response.status())} ${response.url()}`);
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(problems).toEqual([]);
  await page.close();
});

// Without a declared icon, browsers request /favicon.ico and log a 404.
// Headless Chromium skips favicons, so the icon is checked directly.
test("the page declares an icon that loads", async ({ page, request }) => {
  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(href).toBeTruthy();
  const response = await request.get(href ?? "");
  expect(response.status()).toBe(200);
});

test("a calculation with the mouse", async ({ page }) => {
  const { key, digits, tape } = calculator(page);
  for (const name of ["1", "2", "Times", "3", "Equals"])
    await key(name).click();
  await expect(digits).toHaveText("36");
  await expect(tape.getByRole("listitem")).toHaveText(["12 × 3 = 36"]);
  await expectNoAxeViolations(page);
});

test("a calculation with the keyboard only", async ({ page }) => {
  const { machine, digits, topLine } = calculator(page);
  await page.keyboard.press("Tab");
  await expect(machine).toBeFocused();
  expect(
    await machine.evaluate((element) => element.matches(":focus-visible")),
  ).toBe(true);
  await page.keyboard.type("0.1+0.2");
  await page.keyboard.press("Enter");
  await expect(digits).toHaveText("0.3");
  await expect(topLine).toHaveText("0.1 + 0.2 =");
  // Tab reaches the keys too; Enter on a focused key presses that key.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Square root" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(topLine).toHaveText(/square root of 0\.3 =/);
});

test("an API error, then recovery", async ({ page }) => {
  const { machine, digits, topLine, tape } = calculator(page);
  await machine.focus();
  await page.keyboard.type("8/0=");
  await expect(topLine).toHaveText(
    "Can't divide by zero. Type a number or press AC.",
  );
  await expect(digits).toHaveText("Error");
  await expect(tape.getByRole("listitem")).toHaveText(["8 ÷ 0 = ERROR"]);
  await page.keyboard.type("7");
  await expect(digits).toHaveText("7");
  await expect(topLine).toHaveText("");
});

test("no connection, then retry with =", async ({ page }) => {
  const { machine, digits, topLine } = calculator(page);
  await page.route("**/api/v1/calculations", (route) =>
    route.abort("internetdisconnected"),
  );
  await machine.focus();
  await page.keyboard.type("9");
  await page.keyboard.press("r");
  await expect(topLine).toHaveText("No connection. Press = to try again.");
  await page.unroute("**/api/v1/calculations");
  await page.keyboard.press("=");
  await expect(digits).toHaveText("3");
  await expect(topLine).toHaveText(/square root of 9 =/);
});

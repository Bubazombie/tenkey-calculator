import { expect, test } from "@playwright/test";
import { calculator } from "./calculator";

// Every operation key, and the operand order where it matters, typed into the
// real app against the real backend. "r" is square root; "-" before a number
// is its sign.
const calculations = [
  { keys: "7-2=", display: "5" },
  { keys: "8/2=", display: "4" },
  { keys: "2^3=", display: "8" },
  { keys: "144r", display: "12" },
  { keys: "50%", display: "0.5" },
  { keys: "200+10%=", display: "220" },
  { keys: "200-10%=", display: "180" },
  { keys: "200*10%=", display: "20" },
  { keys: "0.1+0.2=", display: "0.3" },
  { keys: "5*-3=", display: "-15" },
  { keys: "2+3*4=", display: "20" },
  { keys: "1/3*3=", display: "1" },
];

for (const { keys, display } of calculations) {
  test(`${keys} shows ${display}`, async ({ page }) => {
    await page.goto("/");
    const { machine, digits } = calculator(page);
    await machine.focus();
    await page.keyboard.type(keys);
    await expect(digits).toHaveText(display);
  });
}

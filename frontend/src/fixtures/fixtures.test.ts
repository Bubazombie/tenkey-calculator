import { expect, test } from "vitest";
import { DISPLAY_CELLS, VISIBLE_TAPE_LINES } from "../calculator/view";
import { fixtureNames, fixtures } from "./fixtures";

test.each(fixtureNames)("%s fits the display and the tape", (name) => {
  const view = fixtures[name];
  if (view.digits !== "Error") {
    expect(view.digits.replace(".", "").length).toBeLessThanOrEqual(
      DISPLAY_CELLS,
    );
  }
  expect(view.tape.length).toBeLessThanOrEqual(VISIBLE_TAPE_LINES);
});

test.each(fixtureNames)("%s uses only numbers the display can show", (name) => {
  const numbers = fixtures[name].tape.flatMap((line) => [
    ...line.operands,
    line.result ?? "0",
  ]);
  for (const number of numbers) {
    expect(number.replace(/[-.]/g, "").length, number).toBeLessThanOrEqual(
      DISPLAY_CELLS - (number.startsWith("-") ? 1 : 0),
    );
  }
});

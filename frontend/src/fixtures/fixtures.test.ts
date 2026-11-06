import { expect, test } from "vitest";
import { DISPLAY_CELLS, VISIBLE_TAPE_LINES } from "../calculator/view";
import { fixtureFromSearch, fixtureNames, fixtures } from "./fixtures";

test("?fixture=name picks that fixture", () => {
  expect(fixtureFromSearch("?fixture=reference")).toBe(fixtures.reference);
  expect(fixtureFromSearch("?fixture=no-connection")).toBe(
    fixtures["no-connection"],
  );
});

test.each(["", "?fixture=missing", "?fixture=toString", "?other=reference"])(
  "%j falls back to the fresh machine",
  (search) => {
    expect(fixtureFromSearch(search)).toBe(fixtures.fresh);
  },
);

test.each(fixtureNames)("%s fits the display and the tape", (name) => {
  const view = fixtures[name];
  if (view.digits !== "Error") {
    expect(view.digits.replace(".", "").length).toBeLessThanOrEqual(
      DISPLAY_CELLS,
    );
  }
  expect(view.tape.length).toBeLessThanOrEqual(VISIBLE_TAPE_LINES);
});

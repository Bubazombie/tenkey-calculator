import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import type { TapeEntry } from "../calculator/view";
import "../styles/global.css";
import { Tape } from "./Tape";

const line = (id: number): TapeEntry => ({
  id,
  operation: "add",
  operands: [String(id), "1"],
  result: String(id + 1),
});

test("the line feeding out of view is hidden from assistive technology", async () => {
  const screen = await render(<Tape entries={[1, 2, 3, 4, 5].map(line)} />);
  const items = Array.from(
    screen.getByRole("list", { name: "Tape" }).element().children,
  );
  expect(items.map((item) => item.getAttribute("aria-hidden"))).toEqual([
    "true",
    null,
    null,
    null,
    null,
  ]);
  expect(items.at(-1)?.getAttribute("data-kind")).toBe("last");
});

test("each new line replays the feed animation", async () => {
  const screen = await render(<Tape entries={[line(1)]} />);
  const list = screen.getByRole("list", { name: "Tape" });
  await expect.element(list).toHaveAttribute("data-feed", "1");
  await screen.rerender(<Tape entries={[line(1), line(2)]} />);
  await expect.element(list).toHaveAttribute("data-feed", "0");
});

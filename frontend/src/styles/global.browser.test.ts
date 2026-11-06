import { expect, test } from "vitest";
import "./global.css";

const faces = [
  { family: "Bricolage Grotesque", weight: 500, style: "normal" },
  { family: "Bricolage Grotesque", weight: 700, style: "normal" },
  { family: "Courier Prime", weight: 400, style: "normal" },
  { family: "Courier Prime", weight: 700, style: "normal" },
  { family: "DSEG7", weight: 700, style: "italic" },
];

test.each(faces)(
  "loads the self-hosted $family $weight $style face",
  async ({ family, weight, style }) => {
    const loaded = await document.fonts.load(
      `${style} ${String(weight)} 16px "${family}"`,
    );
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.status).toBe("loaded");
  },
);

test("paints the page in the paper color", () => {
  expect(getComputedStyle(document.body).backgroundColor).toBe(
    "rgb(251, 243, 231)",
  );
});

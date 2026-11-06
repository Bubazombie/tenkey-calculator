import { describe, expect, test } from "vitest";
import {
  expressionParts,
  type ExpressionPart,
  type Operation,
  spokenText,
  tapeLineParts,
} from "./expression";

/** The visible text, with the drawn square root sign shown as √. */
function visible(parts: readonly ExpressionPart[]): string {
  return parts
    .map((part, index) => {
      if (part.kind === "squareRoot") return "√";
      const previous = parts[index - 1];
      return previous?.kind === "squareRoot" ? part.text : ` ${part.text}`;
    })
    .join("")
    .trim();
}

describe("tape line formats", () => {
  test.each<[Operation, string[], string | null, string]>([
    ["add", ["0.1", "0.2"], "0.3", "0.1 + 0.2 = 0.3"],
    ["subtract", ["5", "-3"], "8", "5 − −3 = 8"],
    ["multiply", ["12", "3"], "36", "12 × 3 = 36"],
    ["divide", ["8", "0"], null, "8 ÷ 0 = ERROR"],
    ["power", ["2", "10"], "1024", "2 ^ 10 = 1024"],
    ["sqrt", ["144"], "12", "√144 = 12"],
    ["percent", ["50"], "0.5", "50 % = 0.5"],
    ["percent_of", ["200", "10"], "20", "10 % of 200 = 20"],
    ["subtract", ["1", "3"], "-2", "1 − 3 = −2"],
  ])("%s %j = %s reads %s", (operation, operands, result, expected) => {
    expect(visible(tapeLineParts(operation, operands, result))).toBe(expected);
  });
});

describe("top line", () => {
  test("a pending operation shows its first operand and symbol", () => {
    expect(visible(expressionParts("multiply", ["12"]))).toBe("12 ×");
  });

  test("a finished calculation shows its whole expression", () => {
    expect(visible(expressionParts("power", ["2", "10"]))).toBe("2 ^ 10");
  });
});

describe("spoken text", () => {
  test("square root and power are read in words", () => {
    expect(spokenText(tapeLineParts("sqrt", ["144"], "12"))).toBe(
      "square root of 144 = 12",
    );
    expect(spokenText(tapeLineParts("power", ["2", "10"], "1024"))).toBe(
      "2 to the power of 10 = 1024",
    );
  });
});

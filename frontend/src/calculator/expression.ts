// How a calculation is written on the tape and on the display's top line.

/** Operations with two operands, entered as "a op b". */
export type BinaryOperation =
  "add" | "subtract" | "multiply" | "divide" | "power";

/** Operation names, exactly as the API expects them. */
export type Operation = BinaryOperation | "sqrt" | "percent" | "percent_of";

export type ExpressionPart =
  | { kind: "number"; text: string }
  | { kind: "symbol"; text: string; spoken?: string }
  | { kind: "word"; text: string }
  | { kind: "squareRoot" };

const MINUS_SIGN = "−";

const number = (value: string): ExpressionPart => ({
  kind: "number",
  text: value.startsWith("-") ? MINUS_SIGN + value.slice(1) : value,
});

const binarySymbols = {
  add: { kind: "symbol", text: "+" },
  subtract: { kind: "symbol", text: MINUS_SIGN },
  multiply: { kind: "symbol", text: "×" },
  divide: { kind: "symbol", text: "÷" },
  power: { kind: "symbol", text: "^", spoken: "to the power of" },
} as const satisfies Record<BinaryOperation, ExpressionPart>;

const percentSign: ExpressionPart = { kind: "symbol", text: "%" };

/**
 * The parts of an expression. A binary operation with only its first operand
 * is a pending operation, such as "12 ×".
 */
export function expressionParts(
  operation: Operation,
  operands: readonly string[],
): ExpressionPart[] {
  const [a = "", b] = operands;
  switch (operation) {
    case "sqrt":
      return [{ kind: "squareRoot" }, number(a)];
    case "percent":
      return [number(a), percentSign];
    case "percent_of":
      // percent_of(a, b) is b % of a.
      return [
        number(b ?? ""),
        percentSign,
        { kind: "word", text: "of" },
        number(a),
      ];
    default: {
      const symbol = binarySymbols[operation];
      return b === undefined
        ? [number(a), symbol]
        : [number(a), symbol, number(b)];
    }
  }
}

export const equalsSign: ExpressionPart = { kind: "symbol", text: "=" };
export const errorWord: ExpressionPart = { kind: "word", text: "ERROR" };

/** A tape line: the expression, "=", and the result or ERROR. */
export function tapeLineParts(
  operation: Operation,
  operands: readonly string[],
  result: string | null,
): ExpressionPart[] {
  return [
    ...expressionParts(operation, operands),
    equalsSign,
    result === null ? errorWord : number(result),
  ];
}

/** Plain text of parts, as a screen reader should hear it. */
export function spokenText(parts: readonly ExpressionPart[]): string {
  return parts
    .map((part) => {
      switch (part.kind) {
        case "squareRoot":
          return "square root of";
        case "symbol":
          return part.spoken ?? part.text;
        default:
          return part.text;
      }
    })
    .join(" ");
}

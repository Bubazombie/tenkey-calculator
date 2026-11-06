import { expect, test } from "vitest";
import { appendDigit, appendPoint, removeLast } from "./typing";

test.each([
  ["", "7", "7"],
  ["0", "7", "7"],
  ["-", "7", "-7"],
  ["-0", "7", "-7"],
  ["12", "3", "123"],
  ["0.", "0", "0.0"],
  ["123456789", "0", "1234567890"],
  ["1234567890", "1", "1234567890"],
  ["-123456789", "1", "-123456789"],
  ["1.23456789", "1", "1.234567891"],
])("appendDigit(%j, %j) is %j", (text, digit, expected) => {
  expect(appendDigit(text, digit)).toBe(expected);
});

test.each([
  ["", "0."],
  ["-", "-0."],
  ["12", "12."],
  ["1.5", "1.5"],
  ["1234567890", "1234567890"],
])("appendPoint(%j) is %j", (text, expected) => {
  expect(appendPoint(text)).toBe(expected);
});

test("removeLast drops one character", () => {
  expect(removeLast("12.")).toBe("12");
  expect(removeLast("-5")).toBe("-");
  expect(removeLast("7")).toBe("");
});

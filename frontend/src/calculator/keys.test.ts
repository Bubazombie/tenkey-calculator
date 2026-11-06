import { describe, expect, test } from "vitest";
import { gridSizes, keys, type KeyDefinition } from "./keys";

const table: readonly KeyDefinition[] = keys;

function cellsOf(key: KeyDefinition): string[] {
  const { column, row, columnSpan = 1, rowSpan = 1 } = key.area;
  const cells: string[] = [];
  for (let c = column; c < column + columnSpan; c++) {
    for (let r = row; r < row + rowSpan; r++) {
      cells.push(`${key.group}:${String(c)},${String(r)}`);
    }
  }
  return cells;
}

describe("key table", () => {
  test("ids are unique", () => {
    const ids = table.map((key) => key.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("no shortcut presses two keys", () => {
    const shortcuts = table.flatMap((key) =>
      key.shortcuts.map((s) => s.toLowerCase()),
    );
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  test("every key has a name and at least one shortcut", () => {
    for (const key of table) {
      expect(key.name, key.id).not.toBe("");
      expect(key.shortcuts.length, key.id).toBeGreaterThan(0);
    }
  });

  test("text legends start the accessible name, except symbols", () => {
    for (const key of table) {
      if (
        key.legend.type === "text" &&
        /^[A-Za-z0-9]+$/.test(key.legend.text)
      ) {
        expect(key.name.startsWith(key.legend.text), key.id).toBe(true);
      }
    }
  });

  test("keys fill each grid exactly, with no overlap", () => {
    for (const [group, size] of Object.entries(gridSizes)) {
      const cells = table.filter((key) => key.group === group).flatMap(cellsOf);
      expect(new Set(cells).size, group).toBe(cells.length);
      expect(cells.length, group).toBe(size.columns * size.rows);
      for (const cell of cells) {
        const [column = 0, row = 0] =
          cell.split(":")[1]?.split(",").map(Number) ?? [];
        expect(column, cell).toBeGreaterThanOrEqual(1);
        expect(column, cell).toBeLessThanOrEqual(size.columns);
        expect(row, cell).toBeGreaterThanOrEqual(1);
        expect(row, cell).toBeLessThanOrEqual(size.rows);
      }
    }
  });
});

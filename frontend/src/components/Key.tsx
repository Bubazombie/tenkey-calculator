import type { KeyDefinition } from "../calculator/keys";
import { ariaKeyShortcuts } from "../calculator/shortcuts";
import styles from "./Key.module.css";
import { KeyLegend } from "./KeyLegend";

interface KeyProps {
  definition: KeyDefinition;
  pressed: boolean;
}

/** One key. The cap moves on press; the button and its hit area stay still. */
export function Key({ definition, pressed }: KeyProps) {
  const { column, row, columnSpan = 1, rowSpan = 1 } = definition.area;
  return (
    <button
      type="button"
      className={styles.key}
      style={{
        gridColumn: `${String(column)} / span ${String(columnSpan)}`,
        gridRow: `${String(row)} / span ${String(rowSpan)}`,
      }}
      aria-label={definition.name}
      aria-keyshortcuts={ariaKeyShortcuts(definition)}
      data-key={definition.id}
      data-kind={definition.kind}
      data-group={definition.group}
      data-pressed={pressed}
    >
      <span className={styles.side} />
      <span className={styles.cap}>
        <KeyLegend legend={definition.legend} />
      </span>
    </button>
  );
}

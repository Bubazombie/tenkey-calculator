import { classNames } from "./classNames";
import { tapeLineParts } from "../calculator/expression";
import type { TapeEntry } from "../calculator/view";
import shadow from "../styles/shadow.module.css";
import { ExpressionText } from "./ExpressionText";
import styles from "./Tape.module.css";

function lineKind(entry: TapeEntry, isLast: boolean) {
  if (entry.result === null) return "error";
  return isLast ? "last" : "old";
}

/** The paper tape: one line per finished calculation, newest at the bottom. */
export function Tape({ entries }: { entries: readonly TapeEntry[] }) {
  return (
    <div className={classNames(shadow.castsShadow, styles.tape)}>
      <div className={styles.face}>
        {/* Safari drops list semantics when list-style is none; the role keeps them. */}
        <ol className={styles.lines} role="list" aria-label="Tape">
          {entries.map((entry, index) => (
            <li
              // Lines are only ever appended, so the index is stable.
              key={index}
              className={styles.line}
              data-kind={lineKind(entry, index === entries.length - 1)}
            >
              <ExpressionText
                parts={tapeLineParts(
                  entry.operation,
                  entry.operands,
                  entry.result,
                )}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

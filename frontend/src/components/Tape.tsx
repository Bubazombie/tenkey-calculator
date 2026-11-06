import { tapeLineParts } from "../calculator/expression";
import { type TapeEntry, VISIBLE_TAPE_LINES } from "../calculator/view";
import shadow from "../styles/shadow.module.css";
import { classNames } from "./classNames";
import { ExpressionText } from "./ExpressionText";
import styles from "./Tape.module.css";

function lineKind(entry: TapeEntry, isLast: boolean) {
  if (entry.result === null) return "error";
  return isLast ? "last" : "old";
}

/**
 * The paper tape: one line per finished calculation, newest at the bottom.
 * A new line feeds the paper up; the line leaving the top is hidden from
 * assistive technology, so everyone gets the same visible lines.
 */
export function Tape({ entries }: { entries: readonly TapeEntry[] }) {
  const leaving = entries.length - VISIBLE_TAPE_LINES;
  const newest = entries.at(-1);
  return (
    <div className={classNames(shadow.castsShadow, styles.tape)}>
      <div className={styles.face}>
        {/* Safari drops list semantics when list-style is none; the role keeps them. */}
        <ol
          className={styles.lines}
          role="list"
          aria-label="Tape"
          // Alternating between two identical animations replays the feed for each new line.
          data-feed={newest === undefined ? undefined : newest.id % 2}
        >
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={styles.line}
              data-kind={lineKind(entry, entry === newest)}
              aria-hidden={index < leaving ? true : undefined}
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

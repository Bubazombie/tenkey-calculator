import { equalsSign, expressionParts } from "../calculator/expression";
import { DISPLAY_CELLS, type TopLine } from "../calculator/view";
import styles from "./Display.module.css";
import { ExpressionText } from "./ExpressionText";

const unlitSegments = "8".repeat(DISPLAY_CELLS);

function TopLineText({ line }: { line: TopLine }) {
  switch (line.kind) {
    case "empty":
      return null;
    case "message":
      return line.text;
    case "expression": {
      const parts = expressionParts(line.operation, line.operands);
      return (
        <ExpressionText
          parts={line.finished ? [...parts, equalsSign] : parts}
        />
      );
    }
  }
}

interface DisplayProps {
  topLine: TopLine;
  digits: string;
}

/** The two-line display: the operation or a message on top, the number below. */
export function Display({ topLine, digits }: DisplayProps) {
  return (
    <div className={styles.display}>
      <div className={styles.lcd}>
        <p className={styles.topLine}>
          <span>
            <TopLineText line={topLine} />
          </span>
        </p>
        <p className={styles.digits}>
          <span className={styles.unlit} aria-hidden="true">
            {unlitSegments}
          </span>
          <span className={styles.value}>{digits}</span>
        </p>
      </div>
    </div>
  );
}

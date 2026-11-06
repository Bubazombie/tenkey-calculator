import type { KeyLegend as Legend } from "../calculator/keys";
import styles from "./KeyLegend.module.css";
import { SquareRootSign } from "./SquareRootSign";

/** What is printed on a key cap. Keys carry their accessible name separately. */
export function KeyLegend({ legend }: { legend: Legend }) {
  switch (legend.type) {
    case "text":
      return legend.text;
    case "power":
      return (
        <span>
          x<sup className={styles.exponent}>y</sup>
        </span>
      );
    case "squareRoot":
      return (
        <span>
          <SquareRootSign />x
        </span>
      );
    case "backspace":
      return (
        <svg
          className={styles.backspace}
          viewBox="0 0 28 19"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M10 1.5h14.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H10L1.5 9.5z" />
          <path d="M14 6l7 7M21 6l-7 7" />
        </svg>
      );
  }
}

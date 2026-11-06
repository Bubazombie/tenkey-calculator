import styles from "./SquareRootSign.module.css";

/**
 * The square root sign, drawn because none of the design fonts has the glyph.
 * It scales with the surrounding text; callers provide the words for it.
 */
export function SquareRootSign() {
  return (
    <svg
      className={styles.sign}
      viewBox="0 0 12 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0.8 9.4 L2.8 8.4 L5.6 14.6 L10 1.2 H11.6" />
    </svg>
  );
}

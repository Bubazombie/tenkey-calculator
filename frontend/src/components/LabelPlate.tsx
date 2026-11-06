import styles from "./LabelPlate.module.css";

interface LabelPlateProps {
  keyboardActive: boolean;
  soundOn: boolean;
  onToggleSound?: (() => void) | undefined;
}

/** The name, the keyboard light and the sound switch. */
export function LabelPlate({
  keyboardActive,
  soundOn,
  onToggleSound,
}: LabelPlateProps) {
  return (
    <div className={styles.plate}>
      <h1 className={styles.brand}>Tenkey</h1>
      <div className={styles.controls}>
        <span
          className={styles.chip}
          role="img"
          aria-label={
            keyboardActive ? "Keyboard shortcuts on" : "Keyboard shortcuts off"
          }
        >
          <span className={styles.light} data-on={keyboardActive} />
          <span aria-hidden="true">Keyboard</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          className={styles.switch}
          onClick={onToggleSound}
        >
          <span className={styles.chip}>
            <span>Sound</span>
            <span className={styles.track} aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  );
}

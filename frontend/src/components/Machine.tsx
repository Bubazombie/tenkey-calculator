import { classNames } from "./classNames";
import { useId } from "react";
import type { InputHandlers } from "../input/useMachineInput";
import { keys } from "../calculator/keys";
import { shortcutHelp } from "../calculator/shortcuts";
import type { MachineView } from "../calculator/view";
import shadow from "../styles/shadow.module.css";
import { Display } from "./Display";
import { Keypad } from "./Keypad";
import { LabelPlate } from "./LabelPlate";
import styles from "./Machine.module.css";
import { Tape } from "./Tape";
import { VisuallyHidden } from "./VisuallyHidden";

const help = shortcutHelp(keys);

interface MachineProps {
  view: MachineView;
  onToggleSound?: (() => void) | undefined;
  /** Pointer and keyboard handlers from useMachineInput; none for a static machine. */
  handlers?: InputHandlers | undefined;
}

/** The printing calculator, drawn from top to bottom as in design/README.md. */
export function Machine({ view, onToggleSound, handlers }: MachineProps) {
  const helpId = useId();
  return (
    <div className={styles.frame}>
      <div
        {...handlers?.machine}
        className={styles.machine}
        // Focusable so its keyboard shortcuts work only while it has focus.
        tabIndex={0}
        role="group"
        aria-label="Tenkey printing calculator"
        aria-describedby={helpId}
      >
        <div
          className={classNames(shadow.castsShadow, styles.roll)}
          aria-hidden="true"
        >
          <div className={styles.rollFace} />
        </div>
        <Tape entries={view.tape} />

        <div className={classNames(shadow.castsShadow, styles.body)}>
          <div className={styles.bodyFace}>
            <div className={styles.housing} aria-hidden="true">
              <div className={styles.slot} />
            </div>
            <Display topLine={view.topLine} digits={view.digits} />
            <LabelPlate
              keyboardActive={view.keyboardActive}
              soundOn={view.soundOn}
              onToggleSound={onToggleSound}
            />
            <Keypad
              pressedKeys={view.pressedKeys}
              keyHandlers={handlers?.key}
            />
          </div>
        </div>

        <div
          className={classNames(shadow.castsShadow, styles.front)}
          aria-hidden="true"
        >
          <div className={styles.frontFace} />
        </div>
        <div className={styles.feet} aria-hidden="true">
          <span className={classNames(shadow.castsShadow, styles.foot)} />
          <span className={classNames(shadow.castsShadow, styles.foot)} />
        </div>

        <VisuallyHidden id={helpId}>{help}</VisuallyHidden>
        <VisuallyHidden role="status" aria-live="polite">
          {/* A new node for every announcement, so the same text is read again. */}
          {view.announcement && (
            <span key={view.announcementId}>{view.announcement}</span>
          )}
        </VisuallyHidden>
      </div>
    </div>
  );
}

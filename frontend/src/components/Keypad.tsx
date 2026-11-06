import type { KeyDefinition, KeyId } from "../calculator/keys";
import { keys } from "../calculator/keys";
import type { InputHandlers } from "../input/useMachineInput";
import { classNames } from "./classNames";
import { Key } from "./Key";
import styles from "./Keypad.module.css";

const functionKeys = keys.filter((key) => key.group === "function");
const padKeys = keys.filter((key) => key.group === "pad");

interface KeypadProps {
  pressedKeys: readonly KeyId[];
  keyHandlers?: InputHandlers["key"] | undefined;
}

/** The key tray: the function row, then the keypad. Both come from the key table. */
export function Keypad({ pressedKeys, keyHandlers }: KeypadProps) {
  const renderKey = (key: KeyDefinition & { id: KeyId }) => (
    <Key
      key={key.id}
      definition={key}
      pressed={pressedKeys.includes(key.id)}
      handlers={keyHandlers?.(key.id)}
    />
  );
  return (
    <div className={styles.well}>
      <div className={classNames(styles.grid, styles.functionRow)}>
        {functionKeys.map(renderKey)}
      </div>
      <div className={classNames(styles.grid, styles.pad)}>
        {padKeys.map(renderKey)}
      </div>
    </div>
  );
}

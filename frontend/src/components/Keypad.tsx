import { classNames } from "./classNames";
import { type KeyId, keys } from "../calculator/keys";
import { Key } from "./Key";
import styles from "./Keypad.module.css";

const functionKeys = keys.filter((key) => key.group === "function");
const padKeys = keys.filter((key) => key.group === "pad");

/** The key tray: the function row, then the keypad. Both come from the key table. */
export function Keypad({ pressedKeys }: { pressedKeys: readonly KeyId[] }) {
  return (
    <div className={styles.well}>
      <div className={classNames(styles.grid, styles.functionRow)}>
        {functionKeys.map((key) => (
          <Key
            key={key.id}
            definition={key}
            pressed={pressedKeys.includes(key.id)}
          />
        ))}
      </div>
      <div className={classNames(styles.grid, styles.pad)}>
        {padKeys.map((key) => (
          <Key
            key={key.id}
            definition={key}
            pressed={pressedKeys.includes(key.id)}
          />
        ))}
      </div>
    </div>
  );
}

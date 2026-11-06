import type { ComponentPropsWithoutRef } from "react";
import styles from "./VisuallyHidden.module.css";

/** Text for assistive technology only. */
export function VisuallyHidden(props: ComponentPropsWithoutRef<"span">) {
  return <span {...props} className={styles.hidden} />;
}

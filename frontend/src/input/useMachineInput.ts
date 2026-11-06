import {
  type ButtonHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import type { KeyId } from "../calculator/keys";
import { isSystemShortcut, keyForShortcut } from "../calculator/shortcuts";

type MachineHandlers = Pick<
  HTMLAttributes<HTMLDivElement>,
  "onKeyDown" | "onKeyUp" | "onFocus" | "onBlur"
> & { ref: RefObject<HTMLDivElement | null> };

type KeyHandlers = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "onPointerDown"
  | "onPointerUp"
  | "onPointerLeave"
  | "onPointerCancel"
  | "onMouseDown"
  | "onClick"
>;

export interface InputHandlers {
  machine: MachineHandlers;
  key: (id: KeyId) => KeyHandlers;
}

interface Callbacks {
  /** The key's action: on key down, or on click so a pointer can still cancel (WCAG 2.5.2). */
  onPress: (key: KeyId) => void;
  /** The key went down or came back up: for sound. */
  onKeyDown?: (key: KeyId) => void;
  onKeyUp?: (key: KeyId) => void;
}

/**
 * Pointer and keyboard input for the machine. Single-key shortcuts only work
 * while the machine has focus (WCAG 2.1.4), and never take over browser
 * shortcuts. Keys go down on press and come back up on release.
 */
export function useMachineInput({ onPress, onKeyDown, onKeyUp }: Callbacks) {
  const machineRef = useRef<HTMLDivElement>(null);
  // The ref answers "is it down?" right away; the state re-renders the keys.
  const pressedRef = useRef(new Set<KeyId>());
  const [pressedKeys, setPressedKeys] = useState<readonly KeyId[]>([]);
  const [keyboardActive, setKeyboardActive] = useState(false);

  const down = useCallback(
    (key: KeyId) => {
      if (pressedRef.current.has(key)) return;
      pressedRef.current.add(key);
      setPressedKeys([...pressedRef.current]);
      onKeyDown?.(key);
    },
    [onKeyDown],
  );

  const up = useCallback(
    (key: KeyId) => {
      if (!pressedRef.current.delete(key)) return;
      setPressedKeys([...pressedRef.current]);
      onKeyUp?.(key);
    },
    [onKeyUp],
  );

  const machine: MachineHandlers = {
    ref: machineRef,
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (isSystemShortcut(event)) return;
      const key = keyForShortcut(event.key);
      if (!key) return;
      // A key button with focus handles Enter itself: it presses that key.
      if (event.key === "Enter" && event.target instanceof HTMLButtonElement)
        return;
      event.preventDefault();
      if (event.repeat) return;
      down(key);
      onPress(key);
    },
    onKeyUp(event: KeyboardEvent<HTMLDivElement>) {
      const key = keyForShortcut(event.key);
      if (key) up(key);
    },
    onFocus() {
      setKeyboardActive(true);
    },
    onBlur(event: FocusEvent<HTMLDivElement>) {
      if (!event.currentTarget.contains(event.relatedTarget))
        setKeyboardActive(false);
    },
  };

  const key = (id: KeyId): KeyHandlers => ({
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button === 0) down(id);
    },
    onPointerUp() {
      up(id);
    },
    onPointerLeave() {
      up(id);
    },
    onPointerCancel() {
      up(id);
    },
    onMouseDown(event: MouseEvent<HTMLButtonElement>) {
      // Keep focus on the machine, so Enter still means equals after a click.
      event.preventDefault();
      machineRef.current?.focus({ preventScroll: true });
    },
    onClick(event: MouseEvent<HTMLButtonElement>) {
      // A click from Enter or Space on a focused key has no pointer press to sound.
      if (event.detail === 0) {
        onKeyDown?.(id);
        onKeyUp?.(id);
      }
      onPress(id);
    },
  });

  return {
    pressedKeys,
    keyboardActive,
    handlers: { machine, key } satisfies InputHandlers,
  };
}

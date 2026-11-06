import type { RequestCalculation } from "./api/calculations";
import styles from "./App.module.css";
import { toView } from "./calculator/toView";
import { useCalculator } from "./calculator/useCalculator";
import { Machine } from "./components/Machine";
import { useMachineInput } from "./input/useMachineInput";
import type { SoundPlayer } from "./sound/soundPlayer";
import { useKeySounds } from "./sound/useKeySounds";

interface AppProps {
  /** Tests replace the network and audio; the app uses the real ones. */
  requestCalculation?: RequestCalculation | undefined;
  createSoundPlayer?: (() => SoundPlayer) | undefined;
}

export function App({ requestCalculation, createSoundPlayer }: AppProps) {
  const calculator = useCalculator(requestCalculation);
  const sounds = useKeySounds(createSoundPlayer);
  const input = useMachineInput({
    onPress: calculator.press,
    onKeyDown: sounds.keyDown,
    onKeyUp: sounds.keyUp,
  });
  const view = toView(calculator.state, {
    pressedKeys: input.pressedKeys,
    keyboardActive: input.keyboardActive,
    soundOn: sounds.soundOn,
  });
  return (
    <main className={styles.page}>
      <Machine
        view={view}
        handlers={input.handlers}
        onToggleSound={sounds.toggleSound}
      />
    </main>
  );
}

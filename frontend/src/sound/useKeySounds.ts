import { useCallback, useEffect, useState } from "react";
import { type KeyId, keyById } from "../calculator/keys";
import { allSoundFiles } from "./soundFiles";
import {
  browserAudio,
  createSoundPlayer,
  type SoundPlayer,
} from "./soundPlayer";

/** Runs a task once the browser is idle after the first paint. */
function whenIdle(task: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(task);
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const handle = setTimeout(task, 200);
  return () => {
    clearTimeout(handle);
  };
}

const defaultPlayer = () => createSoundPlayer(browserAudio);

/** Key sounds, on by default, with a switch to turn them off. */
export function useKeySounds(createPlayer: () => SoundPlayer = defaultPlayer) {
  const [player] = useState(createPlayer);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => whenIdle(() => void player.load(allSoundFiles)), [player]);

  const keyDown = useCallback(
    (key: KeyId) => {
      if (soundOn) player.press(keyById(key).sound);
    },
    [player, soundOn],
  );
  const keyUp = useCallback(
    (key: KeyId) => {
      if (soundOn) player.release(keyById(key).sound);
    },
    [player, soundOn],
  );
  const toggleSound = useCallback(() => {
    setSoundOn((on) => !on);
  }, []);

  return { soundOn, toggleSound, keyDown, keyUp };
}

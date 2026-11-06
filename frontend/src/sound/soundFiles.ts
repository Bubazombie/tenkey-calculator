import press1 from "../assets/sounds/press-1.mp3";
import press2 from "../assets/sounds/press-2.mp3";
import press3 from "../assets/sounds/press-3.mp3";
import press4 from "../assets/sounds/press-4.mp3";
import press5 from "../assets/sounds/press-5.mp3";
import pressBackspace from "../assets/sounds/press-backspace.mp3";
import pressEnter from "../assets/sounds/press-enter.mp3";
import pressWide from "../assets/sounds/press-wide.mp3";
import releaseBackspace from "../assets/sounds/release-backspace.mp3";
import releaseEnter from "../assets/sounds/release-enter.mp3";
import releaseWide from "../assets/sounds/release-wide.mp3";
import release from "../assets/sounds/release.mp3";
import type { KeySound } from "../calculator/keys";

export interface SoundFiles {
  /** Several recordings are picked at random so repeated presses vary. */
  press: readonly string[];
  release: string;
}

/** Recordings of a keyboard switch, one set per kind of key (design/README.md). */
export const soundFiles: Readonly<Record<KeySound, SoundFiles>> = {
  regular: { press: [press1, press2, press3, press4, press5], release },
  wide: { press: [pressWide], release: releaseWide },
  enter: { press: [pressEnter], release: releaseEnter },
  backspace: { press: [pressBackspace], release: releaseBackspace },
};

export const allSoundFiles = Object.values(soundFiles).flatMap((files) => [
  ...files.press,
  files.release,
]);

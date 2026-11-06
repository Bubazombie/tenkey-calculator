import type { KeySound } from "../calculator/keys";
import { soundFiles } from "./soundFiles";

/** The parts of the Web Audio API the player uses, so tests can provide fakes. */
export interface AudioOutput {
  createBufferSource(): {
    buffer: AudioBuffer | null;
    connect(destination: AudioNode): unknown;
    start(): void;
  };
  readonly destination: AudioNode;
}

export interface AudioDeps {
  fetchFile(url: string): Promise<ArrayBuffer>;
  decode(data: ArrayBuffer): Promise<AudioBuffer>;
  /** Called on the first key press, inside the user's gesture. */
  createOutput(): AudioOutput;
  random(): number;
}

/** A random index other than `last`, so the same recording never plays twice in a row. */
export function pickOther(count: number, last: number, random: number): number {
  if (count < 2) return 0;
  const index = Math.floor(random * (count - 1));
  return index >= last ? index + 1 : index;
}

export function createSoundPlayer(deps: AudioDeps) {
  const buffers = new Map<string, AudioBuffer>();
  let output: AudioOutput | null = null;
  let lastPress = -1;

  function play(url: string) {
    const buffer = buffers.get(url);
    if (!buffer) return;
    output ??= deps.createOutput();
    const source = output.createBufferSource();
    source.buffer = buffer;
    source.connect(output.destination);
    source.start();
  }

  return {
    /** Fetches and decodes the files. Sound is optional, so failures are ignored. */
    async load(urls: readonly string[]) {
      await Promise.all(
        urls.map(async (url) => {
          try {
            buffers.set(url, await deps.decode(await deps.fetchFile(url)));
          } catch {
            // A missing recording only means that key stays silent.
          }
        }),
      );
    },
    press(sound: KeySound) {
      const { press } = soundFiles[sound];
      const index =
        sound === "regular"
          ? pickOther(press.length, lastPress, deps.random())
          : 0;
      if (sound === "regular") lastPress = index;
      const url = press[index];
      if (url) play(url);
    },
    release(sound: KeySound) {
      play(soundFiles[sound].release);
    },
  };
}

export type SoundPlayer = ReturnType<typeof createSoundPlayer>;

const SAMPLE_RATE = 44100;

/** The real Web Audio API. Decoding uses an offline context, which needs no user gesture. */
export const browserAudio: AudioDeps = {
  async fetchFile(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${String(response.status)}`);
    return response.arrayBuffer();
  },
  decode(data) {
    return new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(data);
  },
  createOutput: () => new AudioContext(),
  random: Math.random,
};

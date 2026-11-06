import { describe, expect, test, vi } from "vitest";
import { allSoundFiles, soundFiles } from "./soundFiles";
import { type AudioDeps, createSoundPlayer, pickOther } from "./soundPlayer";

/** A fake AudioBuffer that remembers which file it came from. */
const bufferFor = (url: string) => ({ url }) as unknown as AudioBuffer;

function fakeAudio(random = () => 0) {
  const played: string[] = [];
  const output = {
    destination: {} as AudioNode,
    createBufferSource() {
      const source = {
        buffer: null as AudioBuffer | null,
        connect: vi.fn(),
        start() {
          played.push((source.buffer as unknown as { url: string }).url);
        },
      };
      return source;
    },
  };
  const createOutput = vi.fn(() => output);
  const deps: AudioDeps = {
    fetchFile: (url) => Promise.resolve(new TextEncoder().encode(url).buffer),
    decode: (data) =>
      Promise.resolve(bufferFor(new TextDecoder().decode(data))),
    createOutput,
    random,
  };
  return { deps, played, createOutput };
}

test("pickOther never repeats the last index", () => {
  for (const random of [0, 0.2, 0.5, 0.99]) {
    for (let last = 0; last < 5; last++) {
      const index = pickOther(5, last, random);
      expect(index).not.toBe(last);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(5);
    }
  }
});

describe("sound player", () => {
  test("plays nothing and opens no audio output before the files are loaded", () => {
    const { deps, played, createOutput } = fakeAudio();
    createSoundPlayer(deps).press("regular");
    expect(played).toEqual([]);
    expect(createOutput).not.toHaveBeenCalled();
  });

  test("regular keys never play the same recording twice in a row", async () => {
    const { deps, played, createOutput } = fakeAudio(() => 0);
    const player = createSoundPlayer(deps);
    await player.load(allSoundFiles);
    for (let i = 0; i < 6; i++) player.press("regular");
    for (let i = 1; i < played.length; i++)
      expect(played[i]).not.toBe(played[i - 1]);
    expect(played.every((url) => soundFiles.regular.press.includes(url))).toBe(
      true,
    );
    expect(createOutput).toHaveBeenCalledTimes(1);
  });

  test.each(["wide", "enter", "backspace"] as const)(
    "%s keys play their own press and release",
    async (sound) => {
      const { deps, played } = fakeAudio();
      const player = createSoundPlayer(deps);
      await player.load(allSoundFiles);
      player.press(sound);
      player.release(sound);
      expect(played).toEqual([
        soundFiles[sound].press[0],
        soundFiles[sound].release,
      ]);
    },
  );

  test("a file that fails to load only silences its key", async () => {
    const { deps, played } = fakeAudio();
    const failing = soundFiles.enter.press[0];
    const player = createSoundPlayer({
      ...deps,
      fetchFile: (url) =>
        url === failing
          ? Promise.reject(new Error("offline"))
          : deps.fetchFile(url),
    });
    await player.load(allSoundFiles);
    player.press("enter");
    player.release("enter");
    expect(played).toEqual([soundFiles.enter.release]);
  });
});

import { expect, test } from "vitest";
import { allSoundFiles } from "./soundFiles";
import { browserAudio } from "./soundPlayer";

test("every recording loads and decodes in the browser", async () => {
  const buffers = await Promise.all(
    allSoundFiles.map(async (url) =>
      browserAudio.decode(await browserAudio.fetchFile(url)),
    ),
  );
  expect(buffers).toHaveLength(12);
  for (const buffer of buffers) expect(buffer.duration).toBeGreaterThan(0);
});

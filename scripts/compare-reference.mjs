// Review tool, not a test: brings the real app to the state drawn in
// design/reference.html and compares the two. It reports the position and size
// difference of the main parts and of every key, and writes screenshots and a
// pixel diff. The API is answered here, so the Go server is not needed.
//
// Usage (with the frontend dev server running):
//   node scripts/compare-reference.mjs [appUrl] [outputDir]
// Defaults: http://localhost:5173/ and <temp>/tenkey-compare.
// The reference page loads two fonts from Google Fonts, so it needs a network.

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const appUrl = process.argv[2] ?? "http://localhost:5173/";

// The calculations on the reference tape, with the API's answers.
const answers = {
  "add 0.1 0.2": { status: 200, body: { result: "0.3" } },
  "divide 8 0": {
    status: 422,
    body: {
      type: "about:blank",
      title: "Unprocessable Entity",
      status: 422,
      code: "division_by_zero",
      detail: "division by zero is undefined",
    },
  },
  "sqrt 144": { status: 200, body: { result: "12" } },
  "power 2 10": { status: 200, body: { result: "1024" } },
};
const typed = ["0.1+0.2=", "8/0=", "144R", "2^10="];

/** Types the reference calculations, then holds the 5 key down. */
async function reachReferenceState(page) {
  await page.route("**/api/v1/calculations", (route) => {
    const { operation, operands } = route.request().postDataJSON();
    const answer = answers[[operation, ...operands].join(" ")];
    return route.fulfill({ status: answer.status, json: answer.body });
  });
  const machine = page.getByRole("group", {
    name: "Tenkey printing calculator",
  });
  await machine.focus();
  for (const keys of typed) {
    await page.keyboard.press("Escape");
    for (const key of keys)
      await page.keyboard.press(key === "=" ? "Enter" : key);
    await page.waitForResponse("**/api/v1/calculations");
  }
  // Leave keyboard focus, then press 5 with the mouse: the key goes down and
  // the machine gets focus without a keyboard focus ring, as in the reference.
  await page.mouse.click(1, 1);
  const box = await page.locator('[data-key="digit5"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
}
const outputDir = process.argv[3] ?? join(tmpdir(), "tenkey-compare");
const referenceUrl = pathToFileURL(resolve("design/reference.html")).href;

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 1280, height: 860 },
];

// Reference key ids (data-key) mapped to the app's key ids.
const keyIds = {
  sqrt: "squareRoot",
  pow: "power",
  pct: "percent",
  bk: "backspace",
  ac: "clear",
  div: "divide",
  mul: "multiply",
  sub: "subtract",
  add: "add",
  d0: "digit0",
  d1: "digit1",
  d2: "digit2",
  d3: "digit3",
  d4: "digit4",
  d5: "digit5",
  d6: "digit6",
  d7: "digit7",
  d8: "digit8",
  d9: "digit9",
  dot: "decimal",
  eq: "equals",
};

const parts = {
  machine: [".tk-machine", '[aria-label="Tenkey printing calculator"]'],
  display: [".tk-lcd", '[aria-label="Tenkey printing calculator"] p:has(+ p) '],
  plate: [".tk-strip", "div:has(> h1)"],
  tape: [".tk-tape", 'div:has(> ol[aria-label="Tape"])'],
  ...Object.fromEntries(
    Object.entries(keyIds).map(([ref, app]) => [
      `key ${app}`,
      [`[data-key="${ref}"]`, `[data-key="${app}"]`],
    ]),
  ),
};

async function measure(page, side) {
  return page.evaluate(
    ({ parts, side }) => {
      const origin = document
        .querySelector(parts.machine[side])
        .getBoundingClientRect();
      const boxes = {};
      for (const [name, selectors] of Object.entries(parts)) {
        const element = document.querySelector(selectors[side]);
        const target =
          name === "display" && side === 1 ? element.parentElement : element;
        const r = target.getBoundingClientRect();
        boxes[name] = {
          x: r.x - origin.x,
          y: r.y - origin.y,
          w: r.width,
          h: r.height,
        };
      }
      return {
        boxes,
        origin: { x: origin.x, y: origin.y, w: origin.width, h: origin.height },
      };
    },
    { parts, side },
  );
}

async function screenshot(page, origin, path) {
  // Include the offset shadow below and to the right of the machine.
  const pad = Math.ceil(origin.w * 0.04);
  return page.screenshot({
    path,
    clip: {
      x: origin.x,
      y: origin.y,
      width: origin.w + pad,
      height: origin.h + pad,
    },
  });
}

async function pixelDiff(page, a, b, path) {
  const result = await page.evaluate(
    async ({ a, b }) => {
      const load = async (base64) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        return image;
      };
      const [imageA, imageB] = await Promise.all([load(a), load(b)]);
      const width = Math.min(imageA.width, imageB.width);
      const height = Math.min(imageA.height, imageB.height);
      const pixels = (image) => {
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, width, height);
      };
      const dataA = pixels(imageA);
      const dataB = pixels(imageB);
      const out = new ImageData(width, height);
      let different = 0;
      for (let i = 0; i < dataA.data.length; i += 4) {
        const delta = Math.max(
          Math.abs(dataA.data[i] - dataB.data[i]),
          Math.abs(dataA.data[i + 1] - dataB.data[i + 1]),
          Math.abs(dataA.data[i + 2] - dataB.data[i + 2]),
        );
        const isDifferent = delta > 40;
        if (isDifferent) different++;
        out.data.set(
          isDifferent
            ? [255, 0, 80, 255]
            : [dataA.data[i], dataA.data[i + 1], dataA.data[i + 2], 60],
          i,
        );
      }
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext("2d").putImageData(out, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return {
        percent: (100 * different) / (width * height),
        png: btoa(binary),
      };
    },
    { a: a.toString("base64"), b: b.toString("base64") },
  );
  writeFileSync(path, Buffer.from(result.png, "base64"));
  return result.percent;
}

mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport });
    const reference = await context.newPage();
    const app = await context.newPage();
    await reference.goto(referenceUrl, { waitUntil: "networkidle" });
    await app.goto(appUrl, { waitUntil: "networkidle" });
    for (const page of [reference, app])
      await page.evaluate(() => document.fonts.ready);
    await reachReferenceState(app);

    const ref = await measure(reference, 0);
    const ours = await measure(app, 1);
    const deltas = Object.keys(parts).map((name) => {
      const a = ref.boxes[name];
      const b = ours.boxes[name];
      const delta = Math.max(
        ...["x", "y", "w", "h"].map((k) => Math.abs(a[k] - b[k])),
      );
      return { name, delta, ref: a, app: b };
    });
    deltas.sort((p, q) => q.delta - p.delta);

    const shotA = await screenshot(
      reference,
      ref.origin,
      join(outputDir, `${label}-reference.png`),
    );
    const shotB = await screenshot(
      app,
      ours.origin,
      join(outputDir, `${label}-app.png`),
    );
    const percent = await pixelDiff(
      app,
      shotA,
      shotB,
      join(outputDir, `${label}-diff.png`),
    );

    console.log(
      `\n${label}: machine ${ref.origin.w.toFixed(1)} vs ${ours.origin.w.toFixed(1)} px wide, ` +
        `${percent.toFixed(2)}% of pixels differ`,
    );
    for (const { name, delta, ref: a, app: b } of deltas.slice(0, 6)) {
      const box = (r) =>
        `${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.w.toFixed(1)}x${r.h.toFixed(1)}`;
      console.log(
        `  ${name.padEnd(16)} max delta ${delta.toFixed(2)} px  ref ${box(a)}  app ${box(b)}`,
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`\nImages: ${outputDir}`);

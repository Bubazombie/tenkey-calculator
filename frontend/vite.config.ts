import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// The Go API, which serves /api in production on the same origin.
const api = { "/api": "http://localhost:8080" };

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    // Key sounds load when the browser is idle, so they never ride in the bundle.
    assetsInlineLimit: (file) => (file.endsWith(".mp3") ? false : undefined),
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
      reporter: ["text-summary", "json-summary", "html"],
      // A little below the current numbers: the check fails when coverage drops.
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.browser.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.{ts,tsx}"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

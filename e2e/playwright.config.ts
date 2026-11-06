import { defineConfig, devices } from "@playwright/test";

// Its own port, so it never collides with a dev server on 5173 or an API on 8080.
const PORT = 8091;

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${String(PORT)}` },
  projects: [
    {
      name: "desktop",
      testMatch: ["desktop.spec.ts", "calculations.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
      },
    },
    {
      name: "touch",
      testMatch: "touch.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  // The real backend serving the production build, as in Docker.
  webServer: {
    command: `npm run build --workspace frontend && cd backend && go run ./cmd/server -addr 127.0.0.1:${String(PORT)} -static ../frontend/dist`,
    cwd: "..",
    url: `http://127.0.0.1:${String(PORT)}/`,
    // Locally, a server already running on the port is reused (for example in Docker).
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

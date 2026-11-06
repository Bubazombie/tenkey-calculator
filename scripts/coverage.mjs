// Runs both test suites with coverage, writes the HTML reports, and fails
// when coverage drops below the minimums. Works in PowerShell and on Linux.
//   node scripts/coverage.mjs   (or: npm run coverage)
// Reports: backend/coverage/index.html and frontend/coverage/index.html.

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

/** Percent of Go statements. The frontend minimums live in frontend/vite.config.ts. */
const GO_MINIMUM = 80;

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: ["ignore", "inherit", "inherit"],
    // npx is a .cmd script on Windows, which needs a shell.
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

mkdirSync("backend/coverage", { recursive: true });
run("go", ["test", "-coverprofile=coverage/coverage.out", "./..."], "backend");
run(
  "go",
  ["tool", "cover", "-html=coverage/coverage.out", "-o", "coverage/index.html"],
  "backend",
);
const summary = spawnSync(
  "go",
  ["tool", "cover", "-func=coverage/coverage.out"],
  {
    cwd: "backend",
    encoding: "utf8",
  },
);
const total = Number(
  /total:\s+\(statements\)\s+([\d.]+)%/.exec(summary.stdout)?.[1],
);

run("npx", ["vitest", "run", "--coverage"], "frontend");

console.log(
  `\nGo: ${String(total)}% of statements (minimum ${String(GO_MINIMUM)}%)`,
);
if (!(total >= GO_MINIMUM)) {
  console.error("Go coverage is below the minimum.");
  process.exit(1);
}
console.log(
  "Reports: backend/coverage/index.html, frontend/coverage/index.html",
);

# Project rules

Working rules only. Decisions and their details live in README.md.

## Attribution (highest priority)

- No AI attribution anywhere: no Co-Authored-By or session trailers, no "Generated with" lines, no mention of Claude, Anthropic or any AI tool in commits, code, comments, UI text or docs.
- Exceptions: CLAUDE.md, .claude/settings.json, .githooks/, docs/ai-conversation.md and the "How I used AI" section of README.md.
- Enforced by .claude/settings.json and the commit-msg hook (`git config core.hooksPath .githooks`).

## Working agreement

- The user makes product and design decisions. Before any decision, research current practice (UX, then UI, then engineering), cite the sources, and give the reason and the main alternative.
- Push back on choices that work but are not the best option.
- One step at a time, each with a one-line purpose. Wait for the user's OK before the next step. Exception: steps that need no decision, approval or UI review may be chained, two at most, and reported together.
- Report the start and end time of each step. Keep reports short and scannable.
- Never call something done without verifying it: typecheck, lint, tests, build, and the browser for UI. Say explicitly when something could not be verified.
- Say when something the user asks for is not idiomatic Go.
- Bugs: find the root cause before changing code. No symptom patches.
- Leave nothing behind: stop servers, browsers and test runners; delete probes; keep screenshots outside the repo.
- Nothing built "just in case". Adding an operation must touch as few places as possible.

## Code

- Clear over clever, small single-purpose files. SOLID, DRY, KISS and YAGNI as they fit each layer.
- Go: standard library first, Effective Go and Go Code Review Comments, small packages with one job, interfaces defined where they are used, errors as values.
- TypeScript strict, no `any`, explicit types for API data and props. React: pure presentational components, state and fetching in hooks, no duplicated logic or magic values.
- Numbers: never float64. Arithmetic is exact decimal, numbers travel as JSON strings, and the frontend never does arithmetic: every calculation goes through the API.
- The API validates everything and answers every failure with the one documented error shape. No stack traces or internal messages reach the client.
- English everywhere. Comments only where the why is not obvious. No em dashes in code, UI copy, docs or commit messages.
- Scripts run in PowerShell and on Linux: no POSIX-only commands.

## Accessibility, responsiveness and UI

- WCAG 2.2 AA with no exceptions: semantic HTML, full keyboard support, visible focus, a label on every control, aria-live for results and errors, sufficient color contrast.
- The accessible name starts with the visible label. Targets at least 24x24px, 44x44px on coarse pointers. prefers-reduced-motion respected.
- Single-character shortcuts only work while the calculator has focus. Never override browser shortcuts (Ctrl, Meta, Alt combinations); characters typed with AltGr must work.
- Mobile-first at 375px; correct at every width from 320px to large desktop and on short screens.
- API states are always handled: slow response, API error and no connection. The person always knows what happened and what to do next.
- design/ is the approved design and stays untouched. Any deviation is proposed to the user first.

## Performance

- Self-hosted fonts, no layout shift, nothing blocks the first paint, long-term caching for hashed assets.
- Animate transform and opacity only.

## Testing

- Every change ships with all the tests that make sense for it, in the same step.
- Backend: table-driven unit tests for calculation logic, handler tests for every endpoint and every failure path, fuzz tests for parsing and arithmetic.
- Frontend: unit tests for logic, component tests (Vitest browser mode), integration tests for full flows (type, calculate, error, recover), automated accessibility checks, and end-to-end tests in a real browser against the real backend, including 375px and keyboard-only.
- Tests sit next to the code they test; end-to-end tests live in e2e/.
- A new check must be seen failing once before it is trusted.
- After every change, run the whole suite plus typecheck and lint for both layers, and report the results.
- Never delete, skip or weaken a test to make it pass. Coverage thresholds fail the check when coverage drops.

## Commits and docs

- One logical change per commit. Plain imperative subject of 72 characters or fewer, then a blank line and a body that explains why.
- Before each commit, review the diff against this file, report the findings and fix them.
- Files run by sh keep LF endings (.gitattributes enforces it).
- Every decision goes into README "Decisions and trade-offs" in the same step, with its reason and the main alternative.

## Commands

- Everything (run after every change): `npm run check`
- Backend: `npm run lint:backend`, `npm run test:backend`
- Frontend: `npm run typecheck:frontend`, `npm run lint:frontend`, `npm run test:frontend`; dev server `npm run dev --workspace frontend`
- Compare the UI with the design (dev server running): `node scripts/compare-reference.mjs`
- Fixtures: `http://localhost:5173/?fixture=<name>`, names in `frontend/src/fixtures/fixtures.ts`.
- Frontend test names: `*.test.ts` runs in Node, `*.browser.test.ts(x)` runs in Chromium.
- Hook tests: `npm run test:hooks`
- Smart App Control on this machine sometimes blocks new Go test binaries: retry once at most. Fuzzing binaries are always blocked, so long fuzz runs happen on Linux. If it blocks a frontend tool, stop and tell the user; never work around it.

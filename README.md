# Tenkey

A full-stack calculator drawn as a desktop printing calculator. The React frontend sends every calculation to a Go REST API that computes with exact decimals, so 0.1 + 0.2 is 0.3. Each finished calculation prints a line on the paper tape.

_Screenshot added when the UI is built._

## Quick start (Docker)

_Added with the Dockerfile._

## Run locally

### Prerequisites

- Go 1.27
- Node 24

### Backend

_Added with the backend._

### Frontend

_Added with the frontend._

## Project structure

```
backend/     Go REST API
frontend/    React + TypeScript app
e2e/         End-to-end tests (Playwright)
design/      Approved design reference, kept untouched
.githooks/   Commit message hook and its test
```

## Adding an operation

_Filled in once both layers exist: the exact places to touch._

## API

### POST /api/v1/calculations

_Request, response and examples (curl and PowerShell) added with the backend._

### Errors

_Error shape and codes table added with the backend._

### Number format and limits

_Added with the backend._

## Testing

### Commands

| What | Command |
|---|---|
| Commit hook tests | `npm run test:hooks` |

### Coverage

_Coverage table and the command that regenerates both reports added with the tests._

## Accessibility

_Added with the UI._

## Performance

_Lighthouse and bundle size numbers added after measuring._

## Decisions and trade-offs

Each entry gives the decision, why, and the main alternative not picked.

### Architecture

| Decision | Why | Alternative not picked |
|---|---|---|
| One repository with `backend/` and `frontend/`, one root Dockerfile | One place to clone, review and run | Separate repositories |
| Go standard library `net/http`, no web framework | Since Go 1.22 the standard router matches methods and path parameters, which is all this API needs | chi or another router |
| One process serves the API and the built frontend | One container, no extra moving parts, same origin so no CORS | nginx in front of the API, two processes |
| The built frontend is served from a folder given at startup, not embedded in the binary | The backend builds and tests on a fresh clone without building the frontend first; the Dockerfile copies the build in | `go:embed`, which fails to compile until the frontend is built |
| No health endpoint | Nothing calls one: no orchestrator, and the distroless image has no tool for a Docker health check | `GET /healthz` |
| Root npm scripts run both layers | npm is already required and its scripts run in PowerShell and on Linux | Makefile (no `make` on Windows by default) or Taskfile (extra install) |

### API and numbers

| Decision | Why | Alternative not picked |
|---|---|---|
| One endpoint: `POST /api/v1/calculations` with `{operation, operands}` | REST favors nouns; a calculation is sent to the collection and returned with `200` since nothing is stored. A JSON body allows strict validation | `POST /api/v1/calculate` (honest about RPC style), or a `GET` route per operation (cacheable, but query strings are harder to validate strictly) |
| Each operation has exactly one operand count; percent is split into `percent` (b/100) and `percent_of` (a×b/100) | Validation is one lookup in the operations table | One `percent` operation accepting one or two operands |
| Exact decimal arithmetic with `cockroachdb/apd` at 34 significant digits | Implements the General Decimal Arithmetic spec with configurable precision, square root and power, and reports division by zero and overflow as conditions | `shopspring/decimal` (no exact square root), `math/big.Rat` (no square root, 1/3 never ends), `govalues/decimal` (19 digits) |
| Numbers travel as JSON strings in both directions | JSON numbers are parsed as 64-bit floats, which would break exactness | JSON numbers |
| Errors follow RFC 9457 (`application/problem+json`) plus a `code` field; the frontend owns the text it shows | A current standard; no server text reaches the user; one shape for every failure, including 404 and 405 | A custom `{error: {code, message}}` envelope |
| 0^0 returns 1 | What most calculators and Go's `math.Pow` return | An invalid-operation error, as the decimal spec says |

### Calculator behavior

| Decision | Why | Alternative not picked |
|---|---|---|
| Immediate execution, left to right: `2 + 3 ×` computes 5 first | How a tenkey works | Operator precedence, which needs expression parsing |
| One tape line per API call, including intermediate results | Matches a printing calculator | Printing only on `=` |
| Percent follows the Windows convention: `a + b %` and `a − b %` turn b into a×b/100; `a × b %` and `a ÷ b %` turn b into b/100; a lone `b %` is b/100. Pressing % calls the API and shows the converted value | "Add 10%" works as people expect | Always b/100 |
| √ during a pending operation replaces the current entry with its root | Consistent with percent | Applying √ to the pending result |
| A second operator replaces the pending one; `=` after a result does nothing; a digit after a result starts a new number, an operator continues from it | Predictable, no hidden state | Repeating the last operation on `=` |
| AC clears the display and pending operation but keeps the tape | Like real paper | Clearing the tape too |
| A minus pressed before any digit makes the number negative; pressed again it removes the sign; any other operator replaces the pending one and clears the sign | No extra key. Trade-off: a pending operator cannot be changed to minus directly | A ± key |
| Keys pressed while a request is pending are queued and applied in order; an error or AC empties the queue | Fast typists and slow connections lose no input | Ignoring keys while waiting |
| AC cancels a pending request; a request with no answer after 10 seconds counts as no connection | The person is never stuck waiting | No timeout |
| The tape keeps only the lines it shows (plus the line leaving during the feed animation), for sighted and screen-reader users alike | The brief asks for no history; a scrollable tape adds a focus stop and scroll logic | A scrollable history |

### UI and accessibility

| Decision | Why | Alternative not picked |
|---|---|---|
| Every accessible name starts with the visible label (for example "AC, clear all") | WCAG 2.5.3 Label in Name, for voice control users | Names that differ from the legend |
| The tape is readable by screen readers as a list; results are announced by a separate live region | History available to everyone without repeated announcements | Hiding the tape from assistive technology |
| Keypad and function rows are at least 44px tall on coarse pointers | Touch target size on phones | The 24px minimum only |
| The whole machine always fits the screen; its height cap uses `svh` | Every key visible without scrolling, and mobile toolbars do not cut it off. Trade-off: keys get smaller on short phones | Letting the page scroll for bigger keys |
| Static shadow shapes; key travel moves an inner element with `transform` only | No repaint of a filtered layer, and the hit area stays still | The design reference's `filter: drop-shadow` |
| Shortcuts never take over browser combinations; characters typed with AltGr still work | Ctrl+R must reload; `@` needs AltGr on Spanish keyboards | Matching keys regardless of modifiers |
| Key sound starts on, with a visible switch to turn it off | Reviewers notice it. Trade-off: the usual best practice is sound off by default, and a reviewer in a quiet room may be surprised | Sound off by default |
| Sounds are loaded and decoded with the Web Audio API when the browser is idle after the first paint; playback starts on the first user action | The first key press sounds and nothing blocks the first paint | Loading on the first press, which would make it silent |

### Tooling and process

| Decision | Why | Alternative not picked |
|---|---|---|
| CSS Modules plus one global file for tokens and fonts | The design is hand-written CSS with container query units; modules scope it per component at no runtime cost | Tailwind v4 (mostly arbitrary values here), plain global CSS |
| Vitest 4 with a Node project for logic and a browser-mode project for components; Playwright end to end; axe-core in a real browser | Real CSS makes accessibility checks such as contrast meaningful | jsdom, where axe cannot check contrast |
| ESLint with typescript-eslint, jsx-a11y and react-hooks, plus Prettier; gofmt, `go vet` and golangci-lint | Full type-aware and accessibility rules | Biome (faster, partial accessibility and type-aware rules) |
| Coverage is delivered as a README table plus one command that regenerates both reports, with minimum thresholds | Readable without a login, never expires, and the check fails if coverage drops | CI artifacts only |
| The comparison against `design/reference.html` is a review tool, not a CI gate | The reference loads fonts from Google and we changed a few things on purpose | A pixel-diff gate in CI |
| Performance measured locally with Lighthouse and bundle size, numbers recorded here | Enough evidence for a project this size | A Lighthouse CI job |
| All text files are stored with LF; images, fonts and sounds are marked binary | The commit hook runs under sh on Windows, and binaries never depend on detection | Relying on each developer's `core.autocrlf` |
| Plain imperative commit subjects | Short and readable in a small repo | Conventional Commits prefixes |
| AI attribution blocked by project settings and a commit-msg hook | The project rule holds even if one layer fails | Relying on remembering to remove it |

## Scope and time spent

The brief suggests 2 to 4 hours and asks to prioritize correctness, clarity and maintainability. I chose to go further on the UI, accessibility and tests; everything else stays lean.

_Total and breakdown added at the end._

## How I used AI

_Added at the end._

## Git hooks

The commit-msg hook in `.githooks/` removes AI attribution trailers. Enable it once per clone:

```
git config core.hooksPath .githooks
```

## Credits and licenses

- DSEG7 font by Keshikan, SIL Open Font License 1.1 (`design/fonts/DSEG-LICENSE.txt`).
- Key sounds: the "Blue Alps" set from kbsim by Thomas Lai, MIT license (`design/sounds/LICENSE-kbsim.md`).
- Bricolage Grotesque and Courier Prime, SIL Open Font License 1.1.

# Tenkey

A full-stack calculator drawn as a desktop printing calculator. The React frontend sends every calculation to a Go REST API that computes with exact decimals, so 0.1 + 0.2 is 0.3. Each finished calculation prints a line on the paper tape.

_Screenshot added when the UI is built._

## Quick start (Docker)

From the repository root:

```
docker build -t tenkey .
docker run --rm -p 8080:8080 tenkey
```

Then open http://localhost:8080. One container runs the Go server, which answers `/api/` and serves the built frontend.

## Run locally

### Prerequisites

- Go 1.27
- Node 24
- golangci-lint 2 for linting (`winget install GolangCI.golangci-lint` on Windows, see [install options](https://golangci-lint.run/docs/welcome/install/local/))

### Backend

```
cd backend
go run ./cmd/server            # listens on :8080
go run ./cmd/server -addr :9000
go run ./cmd/server -static ../frontend/dist   # also serve a built frontend
```

### Frontend

From the repository root (npm workspaces install the frontend's dependencies):

```
npm install
npx --workspace frontend playwright install chromium   # browser for component tests
npm run dev --workspace frontend                        # http://localhost:5173
```

The dev server forwards `/api` to the backend on `localhost:8080`, so start the backend first. Without it, the calculator shows "No connection. Press = to try again."

## Project structure

```
backend/     Go REST API
  cmd/server/      Entry point: flags, HTTP server, graceful shutdown
  internal/calc/   Exact decimal arithmetic and the operations table
  internal/api/    HTTP handler, request decoding, problem details
  internal/web/    Serves the built frontend with caching and gzip
frontend/    React + TypeScript app (Vite)
  src/api/         API client and the types of its request and response bodies
  src/calculator/  Key table, calculator logic (pure reducer), formats, messages, view model
  src/components/  Presentational components, one CSS Module each
  src/input/       Pointer and keyboard input
  src/sound/       Key sounds (Web Audio)
  src/fixtures/    Machine states for component tests
  src/styles/      Design tokens, self-hosted fonts, global rules
  src/assets/fonts Font files with their licenses
  src/test/        Shared test helpers (axe-core check)
e2e/         End-to-end tests (Playwright)
design/      Approved design reference, kept untouched
.githooks/   Commit message hook and its test
scripts/     Review tools (comparison with the design reference)
```

## Adding an operation

For example a binary `modulo` with a `mod` key:

1. **Backend:** one entry in the `operations` table in `backend/internal/calc/operations.go` (name, operand count, function), and a row in the table-driven tests in `calc_test.go`. The handler, validation, error shape and API docs need no change.
2. **Frontend:** add `"modulo"` to `BinaryOperation` and its tape symbol to `binarySymbols` in `frontend/src/calculator/expression.ts`.
3. **Frontend:** one entry in the key table in `frontend/src/calculator/keys.ts`: legend, kind, accessible name, grid position, shortcuts, action `{ type: "operator", operation: "modulo" }` and sound. The keypad, `aria-keyshortcuts`, the screen reader help, the tape and top-line formats and the API client follow from it. The keypad grid is full today, so a new key also needs a new row in `gridSizes`; the key table tests fail until the grid has no gaps.

A new single-operand operation, like square root, also needs its `KeyAction` handled in `frontend/src/calculator/keyActions.ts`.

## API

### POST /api/v1/calculations

Request body: `{"operation": "<name>", "operands": ["<number>", ...]}` with `Content-Type: application/json`.

| Operation | Operands | Result |
|---|---|---|
| `add` | a, b | a + b |
| `subtract` | a, b | a − b |
| `multiply` | a, b | a × b |
| `divide` | a, b | a ÷ b |
| `power` | a, b | a ^ b |
| `sqrt` | a | √a |
| `percent` | a | a ÷ 100 |
| `percent_of` | a, b | a × b ÷ 100 |

Success is `200` with `{"result": "<number>"}`.

curl (bash):

```
curl -X POST http://localhost:8080/api/v1/calculations \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","operands":["0.1","0.2"]}'
# {"result":"0.3"}
```

PowerShell:

```
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/calculations `
  -ContentType application/json `
  -Body '{"operation":"divide","operands":["8","0"]}'
# Throws with status 422; the body is the problem details below.
```

### Errors

Every failure, including unknown paths and methods, returns `application/problem+json` ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)) with a stable `code`:

```json
{"type":"about:blank","title":"Unprocessable Entity","status":422,"code":"division_by_zero","detail":"division by zero is undefined"}
```

| Status | Code | When |
|---|---|---|
| 400 | `invalid_json` | The body is not one JSON object with `operation` and `operands` |
| 400 | `unknown_operation` | `operation` is missing or not in the table above |
| 400 | `wrong_operand_count` | The number of operands does not match the operation |
| 400 | `invalid_operand` | An operand is not a plain decimal string, or is out of range |
| 413 | `body_too_large` | The body is over 1024 bytes |
| 415 | `unsupported_media_type` | `Content-Type` is not `application/json` |
| 404 | `not_found` | No resource at this path |
| 405 | `method_not_allowed` | Anything but `POST` on `/api/v1/calculations` (`Allow: POST` is set) |
| 422 | `division_by_zero` | Division by zero, including `0 ^ -1` |
| 422 | `domain_error` | No real result, such as `√-4` or `-8 ^ 0.5` |
| 422 | `overflow` | The result reaches 10^34 |
| 500 | `internal` | Unexpected failure; details are only logged on the server |

`detail` is written for developers. The frontend shows its own text based on `code`.

### Number format and limits

Numbers travel as JSON strings in both directions.

- **Accepted:** any plain decimal: an optional minus, digits, and an optional point followed by digits. `3`, `-2.5`, `2.0`, `03` and `-0` are accepted and normalized. Rejected: `+3`, `.5`, `5.`, `1e5`, `NaN`, spaces, empty strings, JSON numbers, and anything longer than 100 characters.
- **Returned:** always canonical: no exponent, no trailing zeros, never `-0`. `1.5 + 1.5` returns `"3"`.
- **Range:** after normalizing, every operand and every result has at most 34 significant digits, at most 34 decimal places, and an absolute value below 10^34. Every result is therefore a valid operand, so calculations can be chained.
- **Rounding:** results are rounded to 34 significant digits, then to 34 decimal places, half away from zero (`2.5` becomes `3`, `-2.5` becomes `-3`).
- **Outside the range:** an operand gets `400 invalid_operand`; a result at or above 10^34 gets `422 overflow`; a result whose magnitude rounds below 10^-34 is `"0"`.
- **Power and square root** are computed with 6 extra digits and then rounded, so exact results stay exact: `4 ^ 0.5` returns `"2"`. `0 ^ 0` returns `"1"`.

## Testing

### Commands

| What | Command |
|---|---|
| Everything | `npm run check` |
| Coverage with minimums | `npm run coverage` |
| End-to-end, real backend serving the production build (port 8091) | `npm run test:e2e` |
| Backend lint (gofmt, goimports, vet, staticcheck, gosec and more) | `npm run lint:backend` |
| Backend tests | `npm run test:backend` |
| Frontend typecheck | `npm run typecheck:frontend` |
| Frontend lint (ESLint and Prettier) | `npm run lint:frontend` |
| Frontend tests | `npm run test:frontend` |
| Commit hook tests | `npm run test:hooks` |

To compare the UI with the approved design, start the frontend dev server and run `node scripts/compare-reference.mjs`. It types the four calculations on the reference tape into the real app (answering the API itself, so the backend is not needed), holds the 5 key down, and compares the result with `design/reference.html` at 320x568, 375x667, 390x844 and 1280x860. It prints the position and size difference of the main parts and every key, and writes screenshots and a pixel diff to a temporary folder. It is a review tool, not a test: the reference loads its fonts from Google Fonts.

Frontend tests named `*.test.ts` run in Node (pure logic); tests named `*.browser.test.ts(x)` render components in a real Chromium through Vitest browser mode, and include axe-core checks against WCAG 2.2 A and AA.

The backend has table-driven tests for the arithmetic and the number rules, and fuzz tests for parsing and every operation. The fuzz seeds run with every `go test`; a longer fuzzing run is `go test ./internal/calc -run '^$' -fuzz FuzzCalculate -fuzztime 30s` (one target at a time).

### Coverage

`npm run coverage` runs both suites with coverage, writes `backend/coverage/index.html` and `frontend/coverage/index.html`, and fails if coverage drops below the minimums.

| Layer | Statements | Branches | Functions | Lines | Minimum |
|---|---|---|---|---|---|
| Go (total) | 81.4% | | | | 80% of statements |
| Frontend | 97.25% | 92.28% | 96.72% | 98.68% | 95%, 90%, 95%, 95% |

Go by package: `api` 98.0%, `calc` 92.3%, `web` 87.3%, `cmd/server` 27.0%. The server's signal handling and graceful shutdown run in the end-to-end tests and Docker, not in unit tests.

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
| The server gzips the frontend's text files (HTML, JS, CSS, SVG) once at startup and serves them to clients that accept gzip; fonts and sounds are sent as they are | The bundle is about 3 times smaller on the wire, requests cost no CPU, and only the standard library is used | Compressing on every request, or adding a build step that writes .gz files |
| Hashed files under /assets/ are cached for a year (immutable); index.html is revalidated on every load (no-cache); directories are never listed | New deploys show at once, while unchanged assets never download twice | Short cache lifetimes for everything |
| A three-stage Dockerfile: Node builds the frontend, Go builds a static binary, and the final image is distroless and runs as a non-root user (17 MB) | Small image with no shell or package manager to attack, and the same server binary as local runs | One image with Node and Go, or nginx serving the frontend |
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
| Tolerant input, strict output: any plain decimal is accepted and normalized; results are always canonical | Someone trying the API with `2.0` should not get an error, while clients can rely on one result format | Accepting only the canonical form |
| One range for operands and results (34 significant digits, 34 decimal places, absolute value below 10^34), plus a 100-character cap on raw input | Every result can be chained as an operand, and every request has bounded cost | Separate limits for input and output |
| Rounding half away from zero, defined for negatives | What people expect from a calculator; `-2.5` becomes `-3` | Half-even (the IEEE default), where `2.5` becomes `2` |
| Power and square root use 6 guard digits, then round to 34 | The library computes them approximately; the extra digits make exact results such as `4 ^ 0.5 = 2` come back exact | Computing at 34 digits, which could return `1.999...9` |
| `percent_of` divides by 100 before multiplying | Dividing by 100 is exact, so there is a single rounding and no false overflow near 10^34 | Multiplying first, where the product can overflow although the result fits |
| Results too small to represent become 0 instead of an error | Their rounded value at 34 decimal places is 0. The library reports results far below that range as an internal "exponent out of range" error, which we map to 0 | An underflow error |
| The overflow limit is set in the decimal context itself | Huge powers such as `9999999999 ^ 9999999999` fail in microseconds instead of building a huge number | Checking the size only after computing |
| Requests must send `Content-Type: application/json`, bodies are capped at 1 KB | A clear `415` instead of guessing the format; it also stops plain cross-site form posts. The cap fits the largest valid request | Accepting any content type |
| 400 for requests the API cannot read (format, operation, operand count), 422 for valid requests with no mathematical answer (division by zero, domain, overflow) | Lets clients tell a bug in their request from a calculation that has no answer | 400 for everything |
| A panic is answered with a generic 500 problem body, and the cause is logged | Every failure has the same shape and nothing internal reaches the client | Go's default, which drops the connection |
| The HTTP layer depends on a `CalculateFunc` type it defines, not on the calc package's function directly | Interfaces belong where they are used; tests inject failing and panicking calculators | Calling `calc.Calculate` directly, which makes the 500 path untestable |
| The server sets read, write and idle timeouts and shuts down gracefully on interrupt or SIGTERM | Slow clients cannot hold connections forever, and Docker stops cleanly | Go's zero timeouts |
| The Go module is named `tenkey` | It is an application, not a library, so no one imports it by URL | A `github.com/...` path, possible once the repository exists |

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
| After no connection, = resends exactly the failed request, with the same purpose, until another key is pressed | A failed square root or percent retries as itself, not as the pending operation | Rebuilding the request from the current state |
| AC cancels a pending request; a request with no answer after 10 seconds counts as no connection | The person is never stuck waiting | No timeout |
| "Calculating..." appears only after 400 ms | Fast answers do not flash a message | Showing it on every request |
| The API client turns every answer into an outcome: a result, an API error with its code, or no connection (a network failure, or a 502, 503 or 504 from a gateway that cannot reach the API); only an abort rejects | The calculator logic handles one closed set of cases, and a stopped backend behind the dev proxy reads as "No connection" | Throwing on HTTP errors |
| The dev server and `vite preview` proxy `/api` to `localhost:8080` | The frontend calls a relative `/api` path, the same as in production where one server serves both | CORS on the API and an absolute URL in the frontend |
| `App` takes the API request function and the sound player as optional props | Integration tests replace the network and audio without mocking modules | Module mocks |
| A mouse press focuses the machine with `focus({ focusVisible: false })` | Otherwise Chrome draws the keyboard focus ring after a click, because the click itself never moved focus. Supported in Chromium 145+ and Firefox 104+; Safari may still show the ring | Letting the clicked key take focus, which would make Enter repeat that key instead of meaning equals |
| Sound files are never inlined in the JavaScript bundle | Vite inlines files under 4 KB; the 2 KB recordings would have added about 20 KB to the bundle the first paint waits for | Vite's default |
| The display rounds decimals half away from zero to fill 10 digit cells, and shows "Too large to display" when the whole part does not fit. A tiny result such as `1 ÷ 9999999999` shows `0` | Leftovers of inexact results disappear (`(1 ÷ 3 × 3) − 1` shows `0`). Trade-off: a real but tiny result also shows `0`; the full value is kept for chaining | Scientific notation, which the design has no room for |
| The calculator logic is a pure reducer: a key that needs the API sets a request, and the answer is applied as a separate action | Every rule is tested in Node without React, timers or a server | Calling the API from inside the key handlers |
| Keys pressed during a request are stored in the reducer's state and replayed in order when the answer arrives, stopping at the next key that needs the API | The queue is part of the tested logic, not of the network code | A queue in the hook |
| `a ^ b %` turns b into b / 100, like `×` and `÷`; `5 + =` with nothing typed after the operator does nothing | Only `+` and `−` have a "percent of" reading; repeating the left operand is not a rule we agreed on | Treating power like `+` |
| Each tape line has a stable id; the tape keeps one line more than it shows, hidden from assistive technology, while it feeds out | The newest line can be told apart for the feed animation and React keys stay correct after old lines drop | Index keys |
| The live region announces each tape line in words, or the message after a failure | Screen reader users hear what sighted users see printed, once per calculation | Announcing every key |
| The tape keeps only the lines it shows (plus the line leaving during the feed animation), for sighted and screen-reader users alike | The brief asks for no history; a scrollable tape adds a focus stop and scroll logic | A scrollable history |

### UI and accessibility

| Decision | Why | Alternative not picked |
|---|---|---|
| Every accessible name starts with the visible label (for example "AC, clear all", "xy, power"); keys whose legend is a symbol are named the way the symbol is read aloud ("Plus", "Minus", "Times", "Divided by", "Equals", "Percent", "Decimal point", "Square root", "Backspace") | WCAG 2.5.3 Label in Name, for voice control users. Understanding 2.5.3 treats symbols as non-text; reading them aloud matches what screen readers say for "12 × 3" on the tape | Function names such as "Add" and "Subtract" |
| One key table (`src/calculator/keys.ts`) drives the keypad: legend, kind, accessible name, grid position and shortcuts | Adding a key or operation on the frontend touches one place; tests check the grid has no gaps or overlaps and no shortcut is used twice | Keys written out in JSX |
| `aria-keyshortcuts` on every key names physical keys as ARIA 1.2 requires: `Plus` for +, and `Shift+5`, `Shift+6`, `Shift+2` for %, ^ and @ on a US layout | The spec asks for the key pressed, not the character; the numeric keypad types the others unmodified | Listing characters, which the spec calls incorrect |
| The screen reader help text is generated from the key table | It can never drift from the real shortcuts | Hand-written help |
| Static UI first, driven by fixtures picked with `?fixture=name`; once the real state existed the parameter was removed and the fixtures stayed as component test data | Every state could be reviewed in the browser before any logic existed | Building the logic first |
| The square root sign is drawn as one shared inline SVG that scales with the text, on the key and on the tape, with "square root of" for screen readers | None of the three fonts has the glyph, so the reference falls back to a different system font on each platform | The font fallback |
| Tape and top line formats: `12 × 3 = 36`, `2 ^ 10 = 1024`, `√144 = 12`, `50 % = 0.5`, `10 % of 200 = 20`, `8 ÷ 0 = ERROR`; negative numbers use the minus sign (−); `^` is read "to the power of" | Reads like a printed tape and like the keys pressed | Words such as "pow" or "sqrt" |
| Numbers on the tape never break; long lines break at spaces | A number split across lines reads as two numbers | The reference's `overflow-wrap: anywhere` |
| The tape is an `<ol role="list">` | Safari drops list semantics when `list-style` is none; the explicit role keeps them | A plain `<ol>` |
| Display messages: "Calculating...", "No connection. Press = to try again.", "Can't divide by zero. Type a number or press AC.", "No real result. Type a number or press AC.", "Too large to calculate. Type a number or press AC.", "Too large to display. Type a number or press AC.", "Something went wrong on our side. Press = to try again.", "That calculation was rejected. Press AC to start over." | Each says what happened and what to do next, and fits the two reserved lines at 254px (tested) | Raw API error text |
| The machine is a focusable `role="group"` described by the help text | Single-key shortcuts must only work while it has focus (WCAG 2.1.4) | Listening on the whole page |
| The offset shadow is drawn by static pseudo-elements behind every piece (z-index -1 in the machine's stacking context); each piece's painted face is a child that carries the stacking order | Looks like the reference's `drop-shadow` filter without repainting it on every key press | The filter, or one hand-drawn shadow shape that would duplicate the machine's geometry |
| A key's side is its own static element; pressing moves only the cap with `transform`, and dims its highlight with `opacity` | No layout or shadow repaint during key travel; the button's hit area never moves | Animating `box-shadow` as the reference does |
| Bricolage Grotesque stays as two static files instead of Google's 18.7 KB variable file | Tried: the variable file is 26 KB smaller but shifted text widths, and the pixel diff against the reference went from about 1.4% to 2.2% | The variable file |
| The tape is readable by screen readers as a list; results are announced by a separate live region | History available to everyone without repeated announcements | Hiding the tape from assistive technology |
| Keypad and function rows are at least 44px tall on coarse pointers | Touch target size on phones | The 24px minimum only |
| The whole machine always fits the screen; its height cap uses `svh` | Every key visible without scrolling, and mobile toolbars do not cut it off. Trade-off: keys get smaller on short phones | Letting the page scroll for bigger keys |
| Fonts are self-hosted as committed WOFF2 files: Latin subsets of Bricolage Grotesque 500 and 700 and Courier Prime 400 and 700 (from Fontsource 5.3.0), and the design's DSEG7 file. 88 KB in total | The same static instances Google serves the reference, explicit `@font-face` rules in one file, and hashed file names for long-term caching | `@fontsource` npm packages (harder to preload), or the variable Bricolage file (41 to 131 KB) |
| Only DSEG7 and Bricolage 700 are preloaded; the other faces load when first used | The display digits and key legends are in the first paint; preloading everything would compete with the app's script | Preloading all five |
| `font-display: swap` without fallback metric overrides | Every text box in the machine has a fixed size, so a font swap cannot move the layout | `size-adjust` and metric overrides on fallback fonts |
| A global `box-sizing: border-box` | Sizes in the design mean outer sizes; one rule instead of one per element | Repeating `box-sizing` on each component, as the reference does |
| Negative numbers show at most 9 digits | DSEG7's minus sign is as wide as a digit (816 units) and the decimal point has zero width, measured in the font file | An eleventh display cell |
| Static shadow shapes; key travel moves an inner element with `transform` only | No repaint of a filtered layer, and the hit area stays still | The design reference's `filter: drop-shadow` |
| Shortcuts never take over browser combinations; characters typed with AltGr still work | Ctrl+R must reload; `@` needs AltGr on Spanish keyboards | Matching keys regardless of modifiers |
| A pointer press moves the key down at once, but the key acts on click | A press can still be cancelled by moving away (WCAG 2.5.2 Pointer Cancellation) | Acting on pointer down |
| A mouse press on a key keeps focus on the machine; Enter or Space on a key that has keyboard focus presses that key | Enter keeps meaning equals after clicking, while Tab users get standard button behavior | Moving focus to the clicked key |
| Held keys do not repeat | A desk calculator key types once per press | Auto-repeat from the operating system |
| Key sound starts on, with a visible switch to turn it off | Reviewers notice it. Trade-off: the usual best practice is sound off by default, and a reviewer in a quiet room may be surprised | Sound off by default |
| Sounds are loaded and decoded with the Web Audio API when the browser is idle after the first paint; playback starts on the first user action | The first key press sounds and nothing blocks the first paint | Loading on the first press, which would make it silent |
| Decoding uses an `OfflineAudioContext`; the playing `AudioContext` is created inside the first key press | Browsers only allow audio after a user gesture, so this avoids autoplay warnings while keeping the first press audible | Creating the `AudioContext` at load, which starts suspended and logs a warning |
| A sound file that fails to load only silences its key | Sound is optional; it must never break the calculator | Failing loudly |

### Tooling and process

| Decision | Why | Alternative not picked |
|---|---|---|
| CSS Modules plus one global file for tokens and fonts | The design is hand-written CSS with container query units; modules scope it per component at no runtime cost | Tailwind v4 (mostly arbitrary values here), plain global CSS |
| Vitest 4 with a Node project for logic and a browser-mode project for components; Playwright end to end; axe-core in a real browser | Real CSS makes accessibility checks such as contrast meaningful | jsdom, where axe cannot check contrast |
| ESLint with typescript-eslint, jsx-a11y and react-hooks, plus Prettier; gofmt, `go vet` and golangci-lint | Full type-aware and accessibility rules | Biome (faster, partial accessibility and type-aware rules) |
| npm workspaces: one root `npm install` and one lockfile for the frontend | Reviewers run every check from the root with one install | A separate `frontend/` install and lockfile |
| ESLint 9 (not 10) and TypeScript 6.0 (not 7), every other tool on its latest major (Vite 8, React 19.3, Vitest 5, Playwright 1.65) | `eslint-plugin-jsx-a11y` supports ESLint up to 9, and `typescript-eslint` supports TypeScript below 6.1 | The newest majors without accessibility or type-aware lint rules |
| Two lint rule options: `no-noninteractive-tabindex` allows `role="group"`, and `no-redundant-roles` allows `role="list"` on `<ol>` | Each matches a decision above (the focusable machine, the Safari list fix); the reason sits next to the option | Disabling the rules |
| Strict TypeScript beyond `strict`: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, unused checks | Catches undefined array reads and loose optional props at compile time | `strict` alone |
| Test file names choose the environment: `*.test.ts` in Node, `*.browser.test.ts(x)` in Chromium | The convention from the Vitest docs; logic tests stay fast | One environment for everything |
| Known audit finding accepted: a moderate ReDoS in the `minimatch` copy inside `typescript-eslint` | Development-only lint tool matching our own glob patterns; npm's only fix is a downgrade | Downgrading the linter or forcing an untested override |
| Coverage is delivered as a README table plus one command that regenerates both reports, with minimum thresholds | Readable without a login, never expires, and the check fails if coverage drops | CI artifacts only |
| End-to-end tests run Playwright against the Go server serving the production build, in two projects: desktop (mouse, keyboard only, API error and recovery, no connection and retry) and 375px with touch (44px keys, tapping); each runs axe | The same setup as Docker, and the flows that matter most, without duplicating the component tests | Testing against the Vite dev server |
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
- Key sounds: the "Blue Alps" set from kbsim by Thomas Lai, MIT license (`frontend/src/assets/sounds/LICENSE-kbsim.md`).
- Bricolage Grotesque and Courier Prime, SIL Open Font License 1.1, Latin subsets from Fontsource (`frontend/src/assets/fonts/`, with their licenses).

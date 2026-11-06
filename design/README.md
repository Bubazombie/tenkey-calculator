# Design reference

The approved visual design for the calculator UI.

- `reference.html`: a static page with no logic. Open it in a browser and resize the window to see how it scales. The 5 key is drawn in its pressed state.
- `desktop.png`, `mobile.png`: the same page at 1280x860 and 390x844.
- `fonts/`: the display font, with its license.
- `sounds/`: the key recordings, with their license.

## The object

A desktop printing calculator seen from the front, drawn in flat inks with dark outlines and a hard offset shadow. From top to bottom:

1. Paper roll and tape. The tape is the calculation history.
2. Printer housing with the paper slot and tear bar.
3. Two-line display.
4. Label plate: the name, the keyboard light and the sound switch.
5. Key tray: a row of function keys, then the keypad laid out like a keyboard's numeric keypad (tall plus, tall equals, wide zero).
6. Front face and feet.

## Palette

| Token | Hex | Used for |
|---|---|---|
| Paper | `#fbf3e7` | Page background |
| Tape white | `#fffaf1` | Tape, roll, label plate |
| Plum | `#40102f` | Outlines, text |
| Plum key | `#5b1a47` | Digit keys, display frame, front face |
| Plum deep | `#2a0920` | Key sides, display digits, feet |
| Magenta | `#f0679f` | Operator keys |
| Magenta deep | `#b22a6d` | Operator key sides, error ink on the tape |
| Pink | `#f7c4d8` | Function keys, printer housing |
| Pink deep | `#dc8fb0` | Function key sides, tray shadow |
| Body pink | `#fbe3e8` | Machine body (with a magenta dot pattern) |
| Cream | `#f9e58f` | Display, equals key, lit keyboard light |
| Cream deep | `#cfae48` | Equals key side, display inner shadow |
| Shadow pink | `#f3a4c5` | Offset shadow under the machine |

Every text and legend pair in the reference measures at least 5.6:1.

## Type

- Bricolage Grotesque, weights 500 and 700: key legends, name, labels.
- Courier Prime, weights 400 and 700: the tape.
- DSEG7 Classic Bold Italic: the display digits.

All three are under the SIL Open Font License. The app should self-host them.

## Sizing

- Every measure inside the machine is a fraction of the machine's width (container query units), so legends, keys and spacing scale together.
- Machine width: the smallest of the available width, 480px, and a cap based on the viewport height so the whole machine fits on screen. It never goes below 254px; under that the page scrolls.
- Checked from 254px to 480px wide: no legend leaves its key and nothing overflows.
- On touch screens the function row is at least 44px tall.

## Behavior

Keys

- A key goes down on pointer press and on physical key press, and comes back up on release.
- The key travel is a short transition; with reduced motion it is instant.
- Legends are centered. Digit keys are plum, operators magenta, functions pink, equals cream.

Physical keyboard

- Digits, `.` or `,`, `+ - * /`, `Enter` or `=`, `Backspace`, `Esc` or `Delete` (clear), `%`, `^` or `Y` (power), `@` or `R` (square root).
- Shortcuts only work while the calculator has focus (WCAG 2.1.4). The keyboard light is on while it has focus.
- A mouse press on a key keeps focus on the machine, so Enter still means equals. When a key has keyboard focus (Tab), Enter and Space press that key.

Display

- Top line, small: the operation in progress (for example `12 ×`) and messages. It always reserves two lines so nothing moves.
- Bottom line, large: the number, up to 10 digits.
- A negative number is entered with the minus key before the number.

Tape

- Each finished calculation prints one line: `12 × 3 = 36`.
- A failed calculation prints `8 ÷ 0 = ERROR` in magenta bold, and the display shows the message.
- The newest line is at the bottom, in bold. Four lines are visible. A new line feeds the paper up in 140ms (instant with reduced motion).

States

- Waiting for the API for more than 400ms: the top line shows `Calculating...`.
- API error (division by zero, invalid input): the message on the top line and `Error` on the bottom line.
- Network failure: `No connection. Press = to try again.` The pending calculation is kept.

Sound

- Real recordings of a keyboard switch, one on press and one on release.
- `press-1` to `press-5`: regular keys, picked at random, never the same twice in a row.
- `press-wide`, `release-wide`: the wide zero and the tall plus.
- `press-enter`, `release-enter`: equals.
- `press-backspace`, `release-backspace`: delete.
- Sound starts on. The switch on the label plate turns it off.

## Open points for the implementation

- What percent means inside a pending operation.
- Number limits and precision.
- The offset shadow is a CSS filter in the reference; static shadow shapes would repaint less.
- Phones with short screens: the machine shrinks to fit, which makes keys small.

## Credits

- Key sounds: the "Blue Alps" set from kbsim by Thomas Lai (github.com/tplai/kbsim), MIT license. See `sounds/LICENSE-kbsim.md`.
- DSEG font by Keshikan, SIL Open Font License 1.1. See `fonts/DSEG-LICENSE.txt`.

import type { KeyId } from "./keys";
import { messages } from "./messages";
import { shown } from "./outcomes";
import type { CalculatorState } from "./state";
import type { MachineView, TopLine } from "./view";

function digits(state: CalculatorState): string {
  if (state.error) return "Error";
  const { operand } = state;
  if (operand?.kind === "typed") return operand.text;
  if (operand?.kind === "computed") return shown(operand.value);
  return shown(state.pending?.left ?? state.result ?? "0");
}

function topLine(state: CalculatorState): TopLine {
  if (state.request && state.slow)
    return { kind: "message", text: messages.calculating };
  if (state.message) return { kind: "message", text: messages[state.message] };
  if (state.pending) {
    return {
      kind: "expression",
      operation: state.pending.operation,
      operands: [shown(state.pending.left)],
      finished: false,
    };
  }
  if (state.finished)
    return { kind: "expression", ...state.finished, finished: true };
  return { kind: "empty" };
}

export interface MachineInputs {
  pressedKeys: readonly KeyId[];
  keyboardActive: boolean;
  soundOn: boolean;
}

export function toView(
  state: CalculatorState,
  inputs: MachineInputs,
): MachineView {
  return {
    ...inputs,
    tape: state.tape,
    topLine: topLine(state),
    digits: digits(state),
    announcement: state.announcement,
    announcementId: state.announcementId,
  };
}

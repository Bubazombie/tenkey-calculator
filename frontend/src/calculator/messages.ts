// Text for the display's top line. Each message says what happened and what to do next.

export const messages = {
  calculating: "Calculating...",
  noConnection: "No connection. Press = to try again.",
  divisionByZero: "Can't divide by zero. Type a number or press AC.",
  noRealResult: "No real result. Type a number or press AC.",
  tooLargeToCalculate: "Too large to calculate. Type a number or press AC.",
  tooLargeToDisplay: "Too large to display. Type a number or press AC.",
  serverError: "Something went wrong on our side. Press = to try again.",
  rejected: "That calculation was rejected. Press AC to start over.",
} as const;

export type MessageId = keyof typeof messages;

const messagesByCode: Readonly<Record<string, MessageId>> = {
  division_by_zero: "divisionByZero",
  domain_error: "noRealResult",
  overflow: "tooLargeToCalculate",
  internal: "serverError",
};

/** The message for an API error code. Other request errors mean a frontend bug. */
export function messageForApiError(code: string, status: number): MessageId {
  return messagesByCode[code] ?? (status >= 500 ? "serverError" : "rejected");
}

package calc

// Code identifies why a calculation failed. Clients receive it, so values never change.
type Code string

// Codes for every way a calculation can fail because of its input.
const (
	CodeUnknownOperation  Code = "unknown_operation"
	CodeWrongOperandCount Code = "wrong_operand_count"
	CodeInvalidOperand    Code = "invalid_operand"
	CodeDivisionByZero    Code = "division_by_zero"
	CodeDomainError       Code = "domain_error"
	CodeOverflow          Code = "overflow"
)

// Error is a calculation failure caused by the request. Detail is safe to show to clients.
type Error struct {
	Code   Code
	Detail string
}

func (e *Error) Error() string {
	return string(e.Code) + ": " + e.Detail
}

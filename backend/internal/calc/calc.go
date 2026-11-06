// Package calc computes calculator operations with exact decimal arithmetic.
package calc

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/cockroachdb/apd/v3"
)

// decimalContext rounds half away from zero, like a calculator, and reports overflow as
// soon as a value reaches 10^34. Underflow is not trapped: tiny results become 0.
var decimalContext = func() *apd.Context {
	ctx := apd.BaseContext.WithPrecision(maxSignificantDigits)
	ctx.Rounding = apd.RoundHalfUp
	ctx.MaxExponent = maxIntegerDigits - 1
	ctx.Traps = apd.DefaultTraps &^ (apd.Underflow | apd.Subnormal)
	return ctx
}()

const formatHint = `a plain decimal string such as "-12.5": an optional minus, digits, and an optional point followed by digits`

// Calculate applies the named operation to the operands and returns the result
// as a canonical decimal string. Failures caused by the input are *Error values.
func Calculate(operation string, operands []string) (string, error) {
	op, ok := operations[operation]
	if !ok {
		return "", &Error{CodeUnknownOperation, "operation must be one of: " + strings.Join(operationNames(), ", ")}
	}
	if len(operands) != op.operands {
		return "", &Error{CodeWrongOperandCount, fmt.Sprintf("%s takes %d operand(s), got %d", operation, op.operands, len(operands))}
	}
	args := make([]*apd.Decimal, len(operands))
	for i, operand := range operands {
		d, err := parseNumber(operand)
		if err != nil {
			return "", operandError(i, err)
		}
		args[i] = d
	}

	result := new(apd.Decimal)
	conditions, err := op.apply(decimalContext, result, args)
	if err != nil && conditions&apd.Underflow != 0 {
		// The library gives up on results far below 10^-34; rounded, they are 0.
		result.SetInt64(0)
		err = nil
	}
	if err != nil {
		return "", conditionError(conditions, err)
	}
	return finish(result)
}

func operationNames() []string {
	names := make([]string, 0, len(operations))
	for name := range operations {
		names = append(names, name)
	}
	slices.Sort(names)
	return names
}

func operandError(index int, err error) *Error {
	if errors.Is(err, errOutOfRange) {
		return &Error{CodeInvalidOperand, fmt.Sprintf(
			"operands[%d] is out of range: at most %d significant digits, %d decimal places and an absolute value below 10^%d",
			index, maxSignificantDigits, maxDecimalPlaces, maxIntegerDigits)}
	}
	return &Error{CodeInvalidOperand, fmt.Sprintf("operands[%d] must be %s", index, formatHint)}
}

// conditionError maps a trapped decimal condition to a client error. Anything
// else is unexpected and returned as is, so the caller treats it as internal.
func conditionError(conditions apd.Condition, err error) error {
	switch {
	case conditions&(apd.DivisionByZero|apd.DivisionUndefined) != 0:
		return &Error{CodeDivisionByZero, "division by zero is undefined"}
	case conditions&(apd.Overflow|apd.SystemOverflow) != 0:
		return overflowError()
	case conditions&apd.InvalidOperation != 0:
		return &Error{CodeDomainError, "the result is not a real number"}
	default:
		return err
	}
}

func overflowError() *Error {
	return &Error{CodeOverflow, fmt.Sprintf("the result is too large: its absolute value must stay below 10^%d", maxIntegerDigits)}
}

// finish rounds the result to the shared limits and writes it in canonical form.
func finish(result *apd.Decimal) (string, error) {
	if result.Form == apd.Infinite {
		// Only 0 raised to a negative power gets here: it is a division by zero.
		return "", &Error{CodeDivisionByZero, "division by zero is undefined"}
	}
	if result.Form != apd.Finite {
		return "", &Error{CodeDomainError, "the result is not a real number"}
	}
	if result.Exponent < -maxDecimalPlaces {
		if _, err := decimalContext.Quantize(result, result, -maxDecimalPlaces); err != nil {
			return "", fmt.Errorf("rounding to %d decimal places: %w", maxDecimalPlaces, err)
		}
	}
	normalize(result)
	if !inRange(result) {
		return "", overflowError()
	}
	return formatNumber(result), nil
}

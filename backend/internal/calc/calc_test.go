package calc

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestCalculateResults(t *testing.T) {
	tests := []struct {
		name      string
		operation string
		operands  []string
		want      string
	}{
		{"exact decimal addition", "add", []string{"0.1", "0.2"}, "0.3"},
		{"no trailing zeros", "add", []string{"1.5", "1.5"}, "3"},
		{"tolerant input is normalized", "add", []string{"2.0", "01.50"}, "3.5"},
		{"subtract to zero", "subtract", []string{"1", "1"}, "0"},
		{"subtract to negative", "subtract", []string{"2", "5.5"}, "-3.5"},
		{"multiply", "multiply", []string{"12", "3"}, "36"},
		{"negative zero becomes zero", "multiply", []string{"-1", "0"}, "0"},
		{"negative zero operand is accepted", "add", []string{"-0", "-0.0"}, "0"},
		{"divide exactly", "divide", []string{"1", "8"}, "0.125"},
		{"divide to 34 digits", "divide", []string{"1", "3"}, "0.3333333333333333333333333333333333"},
		{"last digit rounds up", "divide", []string{"2", "3"}, "0.6666666666666666666666666666666667"},
		{"negative last digit rounds away from zero", "divide", []string{"-2", "3"}, "-0.6666666666666666666666666666666667"},
		{"power", "power", []string{"2", "10"}, "1024"},
		{"negative base, integer exponent", "power", []string{"-2", "3"}, "-8"},
		{"negative exponent", "power", []string{"2", "-1"}, "0.5"},
		{"fractional exponent is exact when the result is", "power", []string{"4", "0.5"}, "2"},
		{"fractional exponent, fourth root", "power", []string{"16", "0.25"}, "2"},
		{"fractional exponent above one", "power", []string{"100", "1.5"}, "1000"},
		{"irrational power rounds to 34 digits", "power", []string{"2", "0.5"}, "1.414213562373095048801688724209698"},
		{"zero to the zero is one", "power", []string{"0", "0"}, "1"},
		{"huge power underflows to zero", "power", []string{"0.5", "9999999999"}, "0"},
		{"huge negative exponent underflows to zero", "power", []string{"2", "-9999999999"}, "0"},
		{"tiny result rounds to 34 decimal places", "divide", []string{"1", "9999999999999999999999999999999999"}, "0.0000000000000000000000000000000001"},
		{"square root", "sqrt", []string{"144"}, "12"},
		{"square root of a fraction", "sqrt", []string{"0.25"}, "0.5"},
		{"square root of zero", "sqrt", []string{"0"}, "0"},
		{"irrational square root", "sqrt", []string{"2"}, "1.414213562373095048801688724209698"},
		{"percent", "percent", []string{"50"}, "0.5"},
		{"percent of", "percent_of", []string{"200", "10"}, "20"},
		{"percent of with decimals", "percent_of", []string{"19.99", "21"}, "4.1979"},
		{"percent of the largest value", "percent_of", []string{"9999999999999999999999999999999999", "50"}, "5000000000000000000000000000000000"},
		{"percent of above 100 near the limit", "percent_of", []string{"5000000000000000000000000000000000", "150"}, "7500000000000000000000000000000000"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.operation, tt.operands)
			if err != nil {
				t.Fatalf("Calculate(%q, %q) error = %v", tt.operation, tt.operands, err)
			}
			if got != tt.want {
				t.Errorf("Calculate(%q, %q) = %q, want %q", tt.operation, tt.operands, got, tt.want)
			}
		})
	}
}

// Ties go away from zero, at the 34-digit precision limit and at the 34-decimal-place limit.
func TestCalculateRoundsHalfAwayFromZero(t *testing.T) {
	const big = "1234567890123456789012345678901234"
	const tie = "0.0000000000000000000000000000000025"
	tests := []struct {
		name      string
		operation string
		operands  []string
		want      string
	}{
		{"positive tie at precision", "add", []string{big, "0.5"}, "1234567890123456789012345678901235"},
		{"negative tie at precision", "subtract", []string{"-" + big, "0.5"}, "-1234567890123456789012345678901235"},
		{"positive tie at decimal places", "multiply", []string{tie, "0.1"}, "0.0000000000000000000000000000000003"},
		{"negative tie at decimal places", "multiply", []string{"-" + tie, "0.1"}, "-0.0000000000000000000000000000000003"},
		{"below half rounds to zero", "multiply", []string{"0.0000000000000000000000000000000004", "0.1"}, "0"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.operation, tt.operands)
			if err != nil {
				t.Fatalf("Calculate(%q, %q) error = %v", tt.operation, tt.operands, err)
			}
			if got != tt.want {
				t.Errorf("Calculate(%q, %q) = %q, want %q", tt.operation, tt.operands, got, tt.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	const maxValue = "9999999999999999999999999999999999"
	tests := []struct {
		name      string
		operation string
		operands  []string
		want      Code
	}{
		{"unknown operation", "modulo", []string{"1", "2"}, CodeUnknownOperation},
		{"missing operation", "", []string{"1", "2"}, CodeUnknownOperation},
		{"too few operands", "add", []string{"1"}, CodeWrongOperandCount},
		{"too many operands", "sqrt", []string{"1", "2"}, CodeWrongOperandCount},
		{"no operands", "add", nil, CodeWrongOperandCount},
		{"plus sign", "add", []string{"+3", "1"}, CodeInvalidOperand},
		{"leading point", "add", []string{".5", "1"}, CodeInvalidOperand},
		{"trailing point", "add", []string{"5.", "1"}, CodeInvalidOperand},
		{"exponent", "add", []string{"1e5", "1"}, CodeInvalidOperand},
		{"NaN", "add", []string{"NaN", "1"}, CodeInvalidOperand},
		{"Infinity", "add", []string{"Infinity", "1"}, CodeInvalidOperand},
		{"leading space", "add", []string{" 3", "1"}, CodeInvalidOperand},
		{"trailing newline", "add", []string{"3\n", "1"}, CodeInvalidOperand},
		{"empty", "add", []string{"", "1"}, CodeInvalidOperand},
		{"decimal comma", "add", []string{"1,5", "1"}, CodeInvalidOperand},
		{"double minus", "add", []string{"--1", "1"}, CodeInvalidOperand},
		{"non-ASCII digit", "add", []string{"١", "1"}, CodeInvalidOperand},
		{"34 significant digits are accepted", "add", []string{"1.234567890123456789012345678901234", "1"}, ""},
		{"34 decimal places are accepted", "add", []string{"0.0000000000000000000000000000000001", "1"}, ""},
		{"largest value is accepted", "add", []string{maxValue, "0"}, ""},
		{"long input that normalizes into range is accepted", "add", []string{"0." + strings.Repeat("0", 60), "1"}, ""},
		{"too many significant digits", "add", []string{"12345678901234567890123456789012345", "1"}, CodeInvalidOperand},
		{"too many decimal places", "add", []string{"0.00000000000000000000000000000000001", "1"}, CodeInvalidOperand},
		{"magnitude 10^34", "add", []string{"1" + strings.Repeat("0", 34), "1"}, CodeInvalidOperand},
		{"raw length over the cap", "add", []string{strings.Repeat("0", 101), "1"}, CodeInvalidOperand},
		{"divide by zero", "divide", []string{"8", "0"}, CodeDivisionByZero},
		{"zero divided by zero", "divide", []string{"0", "0"}, CodeDivisionByZero},
		{"zero to a negative power", "power", []string{"0", "-1"}, CodeDivisionByZero},
		{"square root of a negative", "sqrt", []string{"-4"}, CodeDomainError},
		{"negative base, fractional exponent", "power", []string{"-8", "0.5"}, CodeDomainError},
		{"addition overflow", "add", []string{maxValue, "1"}, CodeOverflow},
		{"multiplication overflow", "multiply", []string{maxValue, maxValue}, CodeOverflow},
		{"huge power overflows", "power", []string{"9999999999", "9999999999"}, CodeOverflow},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.operation, tt.operands)
			if tt.want == "" {
				if err != nil {
					t.Fatalf("Calculate(%q, %q) error = %v, want success", tt.operation, tt.operands, err)
				}
				return
			}
			var calcErr *Error
			if !errors.As(err, &calcErr) {
				t.Fatalf("Calculate(%q, %q) = %q, %v; want *Error with code %q", tt.operation, tt.operands, got, err, tt.want)
			}
			if calcErr.Code != tt.want {
				t.Errorf("code = %q, want %q (detail %q)", calcErr.Code, tt.want, calcErr.Detail)
			}
			if calcErr.Detail == "" {
				t.Error("detail is empty")
			}
		})
	}
}

// The detail names the operand and its actual problem.
func TestInvalidOperandDetails(t *testing.T) {
	tests := []struct {
		name     string
		operand  string
		contains []string
		excludes string
	}{
		{"wrong format", "1e5", []string{"operands[1]", "plain decimal"}, ""},
		{"too long", strings.Repeat("1", 101), []string{"operands[1]", "100 characters"}, "plain decimal"},
		{"out of range", "1" + strings.Repeat("0", 34), []string{"operands[1]", "out of range"}, "plain decimal"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Calculate("add", []string{"1", tt.operand})
			var calcErr *Error
			if !errors.As(err, &calcErr) {
				t.Fatalf("error = %v, want *Error", err)
			}
			for _, want := range tt.contains {
				if !strings.Contains(calcErr.Detail, want) {
					t.Errorf("detail %q does not mention %q", calcErr.Detail, want)
				}
			}
			if tt.excludes != "" && strings.Contains(calcErr.Detail, tt.excludes) {
				t.Errorf("detail %q mentions %q", calcErr.Detail, tt.excludes)
			}
		})
	}
}

// Every outcome is either a canonical result that can be chained as an operand, or
// an *Error. Any other error would reach clients as an internal error.
func FuzzCalculate(f *testing.F) {
	seeds := [][2]string{
		{"0.1", "0.2"}, {"8", "0"}, {"0", "0"}, {"-8", "0.5"}, {"9999999999", "9999999999"},
		{"0.5", "9999999999"}, {"2", "-9999999999"}, {"9999999999999999999999999999999999", "2"},
		{"0.0000000000000000000000000000000025", "0.1"}, {"-1", "0"}, {"4", "0.5"},
	}
	for _, s := range seeds {
		f.Add(s[0], s[1])
	}
	f.Fuzz(func(t *testing.T, a, b string) {
		for _, name := range operationNames() {
			operands := []string{a, b}[:operations[name].operands]
			got, err := Calculate(name, operands)
			if isRational(name) && allValid(operands) {
				checkAgainstOracle(t, name, operands, got, err)
			}
			if err != nil {
				var calcErr *Error
				if !errors.As(err, &calcErr) {
					t.Fatalf("Calculate(%q, %q) returned an unexpected error: %v", name, operands, err)
				}
				continue
			}
			if !canonical.MatchString(got) || got == "-0" {
				t.Fatalf("Calculate(%q, %q) = %q, not canonical", name, operands, got)
			}
			if _, err := parseNumber(got); err != nil {
				t.Fatalf("Calculate(%q, %q) = %q, which is not accepted as an operand: %v", name, operands, got, err)
			}
		}
	})
}

// Huge exponents must fail or finish fast instead of keeping the server busy.
func TestHugePowersFinishQuickly(t *testing.T) {
	const limit = time.Second
	for _, operands := range [][]string{
		{"9999999999", "9999999999"},
		{"0.5", "9999999999"},
		{"1.0000000001", "9999999999.9999999999"},
	} {
		start := time.Now()
		_, _ = Calculate("power", operands)
		if elapsed := time.Since(start); elapsed > limit {
			t.Errorf("power %q took %v, want under %v", operands, elapsed, limit)
		}
	}
}

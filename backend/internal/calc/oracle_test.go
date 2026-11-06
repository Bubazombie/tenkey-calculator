package calc

// These tests check the arithmetic itself against an independent oracle:
// math/big.Rat, which is exact for +, −, ×, ÷ and both percents. The exact
// value is rounded with the API's documented rules and must match our result
// character for character. Square root and whole powers are checked by
// reversing them, within one unit of the result's last digit.

import (
	"errors"
	"math/big"
	"math/rand/v2"
	"strconv"
	"strings"
	"testing"
)

func ratOf(t testing.TB, s string) *big.Rat {
	t.Helper()
	r, ok := new(big.Rat).SetString(s)
	if !ok {
		t.Fatalf("not a decimal: %q", s)
	}
	return r
}

func pow10(n int) *big.Rat {
	p := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(abs(n))), nil)
	if n < 0 {
		return new(big.Rat).SetFrac(big.NewInt(1), p)
	}
	return new(big.Rat).SetInt(p)
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// integerDigits returns e such that 10^(e-1) <= x < 10^e, for x > 0.
func integerDigits(x *big.Rat) int {
	e := 1
	for x.Cmp(pow10(e)) >= 0 {
		e++
	}
	for x.Cmp(pow10(e-1)) < 0 {
		e--
	}
	return e
}

// roundHalfUp returns x * 10^places rounded half away from zero, for x >= 0.
func roundHalfUp(x *big.Rat, places int) *big.Int {
	scaled := new(big.Rat).Mul(x, pow10(places))
	quotient, remainder := new(big.Int).QuoRem(scaled.Num(), scaled.Denom(), new(big.Int))
	if new(big.Int).Mul(remainder, big.NewInt(2)).Cmp(scaled.Denom()) >= 0 {
		quotient.Add(quotient, big.NewInt(1))
	}
	return quotient
}

// expectedResult rounds an exact value the way the API documents: to 34
// significant digits, then to 34 decimal places, ties away from zero, written
// without exponent or trailing zeros. ok is false when the result overflows.
func expectedResult(exact *big.Rat) (result string, ok bool) {
	if exact.Sign() == 0 {
		return "0", true
	}
	magnitude := new(big.Rat).Abs(exact)
	places := maxSignificantDigits - integerDigits(magnitude)
	scaled := roundHalfUp(magnitude, places)
	if places > maxDecimalPlaces {
		scaled = roundHalfUp(new(big.Rat).SetFrac(scaled, pow10(places-maxDecimalPlaces).Num()), 0)
		places = maxDecimalPlaces
	}
	rounded := new(big.Rat).Mul(new(big.Rat).SetInt(scaled), pow10(-places))
	if rounded.Cmp(pow10(maxIntegerDigits)) >= 0 {
		return "", false
	}
	if rounded.Sign() == 0 {
		return "0", true
	}
	text := rounded.FloatString(max(places, 0))
	if strings.Contains(text, ".") {
		text = strings.TrimRight(strings.TrimRight(text, "0"), ".")
	}
	if exact.Sign() < 0 {
		text = "-" + text
	}
	return text, true
}

// exactValue computes a rational operation exactly. ok is false for division by zero.
func exactValue(t testing.TB, operation string, operands []string) (value *big.Rat, ok bool) {
	t.Helper()
	a := ratOf(t, operands[0])
	hundred := big.NewRat(100, 1)
	switch operation {
	case "percent":
		return new(big.Rat).Quo(a, hundred), true
	}
	b := ratOf(t, operands[1])
	switch operation {
	case "add":
		return new(big.Rat).Add(a, b), true
	case "subtract":
		return new(big.Rat).Sub(a, b), true
	case "multiply":
		return new(big.Rat).Mul(a, b), true
	case "divide":
		if b.Sign() == 0 {
			return nil, false
		}
		return new(big.Rat).Quo(a, b), true
	case "percent_of":
		return new(big.Rat).Quo(new(big.Rat).Mul(a, b), hundred), true
	}
	t.Fatalf("no oracle for %s", operation)
	return nil, false
}

var rationalOperations = []string{"add", "subtract", "multiply", "divide", "percent", "percent_of"}

func isRational(operation string) bool {
	for _, name := range rationalOperations {
		if name == operation {
			return true
		}
	}
	return false
}

// checkAgainstOracle compares one Calculate outcome with the exact answer.
func checkAgainstOracle(t testing.TB, operation string, operands []string, got string, err error) {
	t.Helper()
	exact, defined := exactValue(t, operation, operands)
	var calcErr *Error
	switch {
	case !defined:
		if !errors.As(err, &calcErr) || calcErr.Code != CodeDivisionByZero {
			t.Fatalf("%s %q = %q, %v; want division_by_zero", operation, operands, got, err)
		}
	default:
		want, ok := expectedResult(exact)
		if !ok {
			if !errors.As(err, &calcErr) || calcErr.Code != CodeOverflow {
				t.Fatalf("%s %q = %q, %v; want overflow (exact %s)", operation, operands, got, err, exact.FloatString(40))
			}
			return
		}
		if err != nil || got != want {
			t.Fatalf("%s %q = %q, %v; want %q (exact %s)", operation, operands, got, err, want, exact.FloatString(40))
		}
	}
}

// randomOperand is a number the calculator itself can produce: up to 10
// digits, with or without a decimal point, sometimes negative.
func randomOperand(r *rand.Rand) string {
	n := 1 + r.IntN(10)
	var digits strings.Builder
	for i := range n {
		digit := r.IntN(10)
		if i == 0 && n > 1 && digit == 0 {
			digit = 1 + r.IntN(9)
		}
		digits.WriteString(strconv.Itoa(digit))
	}
	text := digits.String()
	if point := r.IntN(n + 1); point > 0 && point < n {
		text = text[:point] + "." + text[point:]
	} else if point == n && n > 1 {
		text = "0." + text
	}
	if r.IntN(4) == 0 {
		text = "-" + text
	}
	return text
}

func TestClassicDecimalTraps(t *testing.T) {
	tests := []struct {
		operation string
		operands  []string
		want      string
	}{
		{"add", []string{"0.1", "0.2"}, "0.3"},
		{"subtract", []string{"0.3", "0.1"}, "0.2"},
		{"multiply", []string{"0.1", "3"}, "0.3"},
		{"multiply", []string{"1.1", "1.1"}, "1.21"},
		{"multiply", []string{"4.35", "100"}, "435"},
	}
	for _, tt := range tests {
		got, err := Calculate(tt.operation, tt.operands)
		if err != nil || got != tt.want {
			t.Errorf("%s %q = %q, %v; want %q", tt.operation, tt.operands, got, err, tt.want)
		}
		checkAgainstOracle(t, tt.operation, tt.operands, got, err)
	}
}

func TestRationalOperationsMatchExactArithmetic(t *testing.T) {
	tables := [][]string{
		{"9999999999", "9999999999"},
		{"-9999999999", "0.000000001"},
		{"1", "3"},
		{"2", "3"},
		{"-2", "3"},
		{"1", "7"},
		{"0.000000001", "999999999"},
		{"123456789.1", "-0.987654321"},
		{"5", "0"},
		{"0", "0"},
	}
	for _, operands := range tables {
		for _, operation := range rationalOperations {
			args := operands[:operandCount(operation)]
			got, err := Calculate(operation, args)
			checkAgainstOracle(t, operation, args, got, err)
		}
	}

	r := rand.New(rand.NewPCG(1, 2))
	for range 20_000 {
		operands := []string{randomOperand(r), randomOperand(r)}
		for _, operation := range rationalOperations {
			args := operands[:operandCount(operation)]
			got, err := Calculate(operation, args)
			checkAgainstOracle(t, operation, args, got, err)
		}
	}
}

func allValid(operands []string) bool {
	for _, operand := range operands {
		if _, err := parseNumber(operand); err != nil {
			return false
		}
	}
	return true
}

func operandCount(operation string) int {
	return operations[operation].operands
}

// ulp is one unit in the last of the 34 significant digits of x, at least 10^-34.
func ulp(x *big.Rat) *big.Rat {
	if x.Sign() == 0 {
		return pow10(-maxDecimalPlaces)
	}
	exponent := integerDigits(new(big.Rat).Abs(x)) - maxSignificantDigits
	return pow10(max(exponent, -maxDecimalPlaces))
}

func TestSquareRootSquaresBackWithinTheLastDigit(t *testing.T) {
	exact := map[string]string{"144": "12", "0.0001": "0.01", "1522756": "1234", "0": "0", "2.25": "1.5"}
	for x, want := range exact {
		if got, err := Calculate("sqrt", []string{x}); err != nil || got != want {
			t.Errorf("sqrt %s = %q, %v; want %q", x, got, err, want)
		}
	}

	r := rand.New(rand.NewPCG(3, 4))
	for range 5_000 {
		x := strings.TrimPrefix(randomOperand(r), "-")
		got, err := Calculate("sqrt", []string{x})
		if err != nil {
			t.Fatalf("sqrt %s: %v", x, err)
		}
		root := ratOf(t, got)
		unit := ulp(root)
		low := new(big.Rat).Sub(root, unit)
		high := new(big.Rat).Add(root, unit)
		if low.Sign() < 0 {
			low.SetInt64(0)
		}
		value := ratOf(t, x)
		if new(big.Rat).Mul(low, low).Cmp(value) > 0 || new(big.Rat).Mul(high, high).Cmp(value) < 0 {
			t.Fatalf("sqrt %s = %s, but its square is not within one last digit of %s", x, got, x)
		}
	}
}

func TestWholePowersMatchRepeatedMultiplication(t *testing.T) {
	exact := []struct{ base, exponent, want string }{
		{"2", "10", "1024"},
		{"1.1", "2", "1.21"},
		{"-2", "3", "-8"},
		{"2", "-2", "0.25"},
		{"10", "33", "1" + strings.Repeat("0", 33)},
	}
	for _, tt := range exact {
		if got, err := Calculate("power", []string{tt.base, tt.exponent}); err != nil || got != tt.want {
			t.Errorf("%s ^ %s = %q, %v; want %q", tt.base, tt.exponent, got, err, tt.want)
		}
	}

	limit := pow10(maxIntegerDigits)
	r := rand.New(rand.NewPCG(5, 6))
	for range 5_000 {
		base := randomOperand(r)
		exponent := r.IntN(19) - 6
		b := ratOf(t, base)
		if b.Sign() == 0 && exponent <= 0 {
			continue // 0^0 and 0^-n have their own tests.
		}
		value := big.NewRat(1, 1)
		for range abs(exponent) {
			value.Mul(value, b)
		}
		if exponent < 0 {
			value.Inv(value)
		}
		got, err := Calculate("power", []string{base, itoa(exponent)})
		magnitude := new(big.Rat).Abs(value)
		var calcErr *Error
		if errors.As(err, &calcErr) && calcErr.Code == CodeOverflow {
			// Overflow is right when the exact power reaches 10^34, give or take the last digit.
			if new(big.Rat).Add(magnitude, ulp(magnitude)).Cmp(limit) < 0 {
				t.Fatalf("%s ^ %d overflowed, but the exact result %s is in range", base, exponent, value.FloatString(5))
			}
			continue
		}
		if err != nil {
			t.Fatalf("%s ^ %d: %v", base, exponent, err)
		}
		ours := ratOf(t, got)
		difference := new(big.Rat).Abs(new(big.Rat).Sub(ours, value))
		if difference.Cmp(ulp(ours)) > 0 {
			t.Fatalf("%s ^ %d = %s, more than one last digit from the exact %s", base, exponent, got, value.FloatString(40))
		}
	}
}

func itoa(n int) string {
	return big.NewInt(int64(n)).String()
}

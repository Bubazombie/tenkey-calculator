package calc

import (
	"errors"
	"regexp"

	"github.com/cockroachdb/apd/v3"
)

// Every operand and every result stays within these limits, so any result can be
// sent back as an operand when calculations are chained.
const (
	maxSignificantDigits = 34
	maxDecimalPlaces     = 34
	maxIntegerDigits     = 34 // the absolute value stays below 10^34
	maxInputLength       = 100
)

// plainDecimal is the accepted input: an optional minus, digits, and an optional
// point followed by digits. Leading zeros, trailing zeros and -0 are normalized.
var plainDecimal = regexp.MustCompile(`^-?[0-9]+(\.[0-9]+)?$`)

var (
	errNotPlainDecimal = errors.New("not a plain decimal")
	errOutOfRange      = errors.New("out of range")
)

// parseNumber reads a plain decimal string and normalizes it.
func parseNumber(s string) (*apd.Decimal, error) {
	if len(s) > maxInputLength || !plainDecimal.MatchString(s) {
		return nil, errNotPlainDecimal
	}
	d, _, err := apd.NewFromString(s)
	if err != nil {
		return nil, errNotPlainDecimal
	}
	normalize(d)
	if !inRange(d) {
		return nil, errOutOfRange
	}
	return d, nil
}

// formatNumber writes the canonical form: no exponent, no trailing zeros, no -0.
func formatNumber(d *apd.Decimal) string {
	return d.Text('f')
}

// normalize removes trailing zeros. Reduce also turns -0 into 0.
func normalize(d *apd.Decimal) {
	d.Reduce(d)
}

func inRange(d *apd.Decimal) bool {
	digits := d.NumDigits()
	exponent := int64(d.Exponent)
	return digits <= maxSignificantDigits &&
		-exponent <= maxDecimalPlaces &&
		digits+exponent <= maxIntegerDigits
}

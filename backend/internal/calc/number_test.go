package calc

import (
	"errors"
	"regexp"
	"strings"
	"testing"
)

// canonical is the only format results are written in.
var canonical = regexp.MustCompile(`^-?(0|[1-9][0-9]*)(\.[0-9]*[1-9])?$`)

func TestParseNumberNormalizes(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"0", "0"},
		{"-0", "0"},
		{"-0.000", "0"},
		{"03", "3"},
		{"3.0", "3"},
		{"1.50", "1.5"},
		{"-007.250", "-7.25"},
		{"100", "100"},
		{"0.001", "0.001"},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			d, err := parseNumber(tt.in)
			if err != nil {
				t.Fatalf("parseNumber(%q) error = %v", tt.in, err)
			}
			if got := formatNumber(d); got != tt.want {
				t.Errorf("formatNumber(parseNumber(%q)) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestParseNumberRejects(t *testing.T) {
	tests := []struct {
		in   string
		want error
	}{
		{"+3", errNotPlainDecimal},
		{".5", errNotPlainDecimal},
		{"5.", errNotPlainDecimal},
		{"1e5", errNotPlainDecimal},
		{"-", errNotPlainDecimal},
		{strings.Repeat("0", 101), errTooLong},
		{"12345678901234567890123456789012345", errOutOfRange},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			if _, err := parseNumber(tt.in); !errors.Is(err, tt.want) {
				t.Errorf("parseNumber(%q) error = %v, want %v", tt.in, err, tt.want)
			}
		})
	}
}

// Any accepted input formats canonically, and the canonical form parses back to itself.
func FuzzParseNumber(f *testing.F) {
	for _, seed := range []string{"0", "-0", "03", "1.50", "-7.25", "1e5", ".5", "9999999999999999999999999999999999", "0.0000000000000000000000000000000001"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, in string) {
		d, err := parseNumber(in)
		if err != nil {
			return
		}
		out := formatNumber(d)
		if !canonical.MatchString(out) || out == "-0" {
			t.Fatalf("parseNumber(%q) formats as %q, which is not canonical", in, out)
		}
		again, err := parseNumber(out)
		if err != nil {
			t.Fatalf("canonical %q does not parse: %v", out, err)
		}
		if formatNumber(again) != out {
			t.Fatalf("canonical %q reformats as %q", out, formatNumber(again))
		}
	})
}

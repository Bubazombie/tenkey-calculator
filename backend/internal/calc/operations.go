package calc

import "github.com/cockroachdb/apd/v3"

// operation computes into result. It returns the decimal conditions it raised and
// a non-nil error when one of them is trapped by the context.
type operation struct {
	operands int
	apply    func(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error)
}

// operations is the single place to add a new operation.
var operations = map[string]operation{
	"add": {2, func(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
		return ctx.Add(result, args[0], args[1])
	}},
	"subtract": {2, func(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
		return ctx.Sub(result, args[0], args[1])
	}},
	"multiply": {2, func(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
		return ctx.Mul(result, args[0], args[1])
	}},
	"divide": {2, func(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
		return ctx.Quo(result, args[0], args[1])
	}},
	"power":      {2, power},
	"sqrt":       {1, sqrt},
	"percent":    {1, percent},
	"percent_of": {2, percentOf},
}

var hundred = apd.New(100, 0)

// guardDigits are extra digits used for power and square root, whose results the
// library computes approximately. Rounding back to 34 digits afterwards makes
// exact results such as 4 ^ 0.5 = 2 come back exact.
const guardDigits = 6

func power(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
	base, exponent := args[0], args[1]
	// The decimal spec calls 0^0 invalid; calculators and Go's math.Pow return 1.
	if base.IsZero() && exponent.IsZero() {
		result.SetInt64(1)
		return 0, nil
	}
	return withGuardDigits(ctx, result, func(wide *apd.Context) (apd.Condition, error) {
		return wide.Pow(result, base, exponent)
	})
}

func sqrt(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
	return withGuardDigits(ctx, result, func(wide *apd.Context) (apd.Condition, error) {
		return wide.Sqrt(result, args[0])
	})
}

func percent(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
	return ctx.Quo(result, args[0], hundred)
}

func percentOf(ctx *apd.Context, result *apd.Decimal, args []*apd.Decimal) (apd.Condition, error) {
	conditions, err := ctx.Mul(result, args[0], args[1])
	if err != nil {
		return conditions, err
	}
	more, err := ctx.Quo(result, result, hundred)
	return conditions | more, err
}

func withGuardDigits(
	ctx *apd.Context,
	result *apd.Decimal,
	compute func(wide *apd.Context) (apd.Condition, error),
) (apd.Condition, error) {
	conditions, err := compute(ctx.WithPrecision(ctx.Precision + guardDigits))
	if err != nil || result.Form != apd.Finite {
		return conditions, err
	}
	more, err := ctx.Round(result, result)
	return conditions | more, err
}

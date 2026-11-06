package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"

	"tenkey/internal/calc"
)

// maxBodyBytes fits the largest valid request with room to spare.
const maxBodyBytes = 1024

const bodyHint = `the body must be a JSON object such as {"operation":"add","operands":["1","2"]}`

var statusByCode = map[calc.Code]int{
	calc.CodeUnknownOperation:  http.StatusBadRequest,
	calc.CodeWrongOperandCount: http.StatusBadRequest,
	calc.CodeInvalidOperand:    http.StatusBadRequest,
	calc.CodeDivisionByZero:    http.StatusUnprocessableEntity,
	calc.CodeDomainError:       http.StatusUnprocessableEntity,
	calc.CodeOverflow:          http.StatusUnprocessableEntity,
}

type calculationRequest struct {
	Operation string   `json:"operation"`
	Operands  []string `json:"operands"`
}

type calculationResponse struct {
	Result string `json:"result"`
}

func (h *handler) createCalculation(w http.ResponseWriter, r *http.Request) {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeProblem(w, h.logger, http.StatusUnsupportedMediaType, codeUnsupportedMediaType, "Content-Type must be application/json")
		return
	}

	req, reqErr := decodeRequest(w, r)
	if reqErr != nil {
		writeProblem(w, h.logger, reqErr.status, reqErr.code, reqErr.detail)
		return
	}

	result, err := h.calculate(req.Operation, req.Operands)
	var calcErr *calc.Error
	switch {
	case errors.As(err, &calcErr):
		writeProblem(w, h.logger, statusByCode[calcErr.Code], string(calcErr.Code), calcErr.Detail)
	case err != nil:
		h.logger.Error("calculation failed", "operation", req.Operation, "error", err)
		writeInternalError(w, h.logger)
	default:
		writeJSON(w, h.logger, "application/json", http.StatusOK, calculationResponse{Result: result})
	}
}

// requestError is what to answer when the request body cannot be used.
type requestError struct {
	status int
	code   string
	detail string
}

// decodeRequest reads exactly one JSON object with known fields.
func decodeRequest(w http.ResponseWriter, r *http.Request) (calculationRequest, *requestError) {
	// A pointer, so a JSON null stays nil instead of decoding to empty fields.
	var body *calculationRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	err := dec.Decode(&body)
	if err == nil && body == nil {
		err = errors.New("the body is null")
	}
	if err == nil && dec.Decode(&struct{}{}) != io.EOF {
		err = errors.New("trailing data after the JSON object")
	}

	var tooLarge *http.MaxBytesError
	var typeErr *json.UnmarshalTypeError
	switch {
	case err == nil:
		return *body, nil
	case errors.As(err, &tooLarge):
		return calculationRequest{}, &requestError{http.StatusRequestEntityTooLarge, codeBodyTooLarge,
			fmt.Sprintf("the body must be at most %d bytes", maxBodyBytes)}
	case errors.As(err, &typeErr) && strings.HasPrefix(typeErr.Field, "operands"):
		return calculationRequest{}, &requestError{http.StatusBadRequest, string(calc.CodeInvalidOperand),
			`operands must be JSON strings holding plain decimals such as "-12.5", not JSON numbers`}
	default:
		return calculationRequest{}, &requestError{http.StatusBadRequest, codeInvalidJSON, bodyHint}
	}
}

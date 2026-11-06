package api

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"tenkey/internal/calc"
)

const calculationsPath = "/api/v1/calculations"

type problemBody struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Code   string `json:"code"`
	Detail string `json:"detail"`
}

func newTestHandler(calculate CalculateFunc) http.Handler {
	return NewHandler(calculate, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func send(t *testing.T, h http.Handler, method, path, contentType, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func decodeProblem(t *testing.T, rec *httptest.ResponseRecorder) problemBody {
	t.Helper()
	if got := rec.Header().Get("Content-Type"); got != "application/problem+json" {
		t.Fatalf("Content-Type = %q, want application/problem+json", got)
	}
	var p problemBody
	if err := json.NewDecoder(rec.Body).Decode(&p); err != nil {
		t.Fatalf("decoding problem: %v", err)
	}
	if p.Status != rec.Code {
		t.Errorf("body status = %d, response status = %d", p.Status, rec.Code)
	}
	if p.Type != "about:blank" || p.Title != http.StatusText(rec.Code) {
		t.Errorf("type, title = %q, %q; want about:blank, %q", p.Type, p.Title, http.StatusText(rec.Code))
	}
	if p.Detail == "" {
		t.Error("detail is empty")
	}
	return p
}

func TestCreateCalculationSucceeds(t *testing.T) {
	h := newTestHandler(calc.Calculate)
	tests := []struct {
		name        string
		contentType string
		body        string
		want        string
	}{
		{"exact decimals", "application/json", `{"operation":"add","operands":["0.1","0.2"]}`, "0.3"},
		{"tolerant operands", "application/json", `{"operation":"multiply","operands":["2.0","03"]}`, "6"},
		{"unary operation", "application/json", `{"operation":"sqrt","operands":["144"]}`, "12"},
		{"content type with charset", "application/json; charset=utf-8", `{"operation":"subtract","operands":["1","3"]}`, "-2"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := send(t, h, http.MethodPost, calculationsPath, tt.contentType, tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body %s", rec.Code, rec.Body)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", got)
			}
			var body map[string]string
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decoding body: %v", err)
			}
			if len(body) != 1 || body["result"] != tt.want {
				t.Errorf("body = %v, want {result: %q}", body, tt.want)
			}
		})
	}
}

func TestCreateCalculationFailures(t *testing.T) {
	h := newTestHandler(calc.Calculate)
	tests := []struct {
		name        string
		contentType string
		body        string
		status      int
		code        string
	}{
		{"division by zero", "application/json", `{"operation":"divide","operands":["8","0"]}`, 422, "division_by_zero"},
		{"square root of a negative", "application/json", `{"operation":"sqrt","operands":["-4"]}`, 422, "domain_error"},
		{"overflow", "application/json", `{"operation":"power","operands":["9999999999","9999999999"]}`, 422, "overflow"},
		{"unknown operation", "application/json", `{"operation":"modulo","operands":["1","2"]}`, 400, "unknown_operation"},
		{"missing operation", "application/json", `{"operands":["1","2"]}`, 400, "unknown_operation"},
		{"wrong operand count", "application/json", `{"operation":"add","operands":["1"]}`, 400, "wrong_operand_count"},
		{"missing operands", "application/json", `{"operation":"add"}`, 400, "wrong_operand_count"},
		{"invalid operand", "application/json", `{"operation":"add","operands":["1e5","1"]}`, 400, "invalid_operand"},
		{"number instead of string", "application/json", `{"operation":"add","operands":[1,2]}`, 400, "invalid_operand"},
		{"null operand", "application/json", `{"operation":"add","operands":[null,"2"]}`, 400, "invalid_operand"},
		{"operation not a string", "application/json", `{"operation":1,"operands":["1","2"]}`, 400, "invalid_json"},
		{"malformed JSON", "application/json", `{"operation":"add",`, 400, "invalid_json"},
		{"empty body", "application/json", ``, 400, "invalid_json"},
		{"array instead of object", "application/json", `["add"]`, 400, "invalid_json"},
		{"unknown field", "application/json", `{"operation":"add","operands":["1","2"],"x":1}`, 400, "invalid_json"},
		{"trailing data", "application/json", `{"operation":"add","operands":["1","2"]}{}`, 400, "invalid_json"},
		{"missing content type", "", `{"operation":"add","operands":["1","2"]}`, 415, "unsupported_media_type"},
		{"form content type", "application/x-www-form-urlencoded", `{"operation":"add","operands":["1","2"]}`, 415, "unsupported_media_type"},
		{"body too large", "application/json", `{"operation":"add","operands":["1","` + strings.Repeat("1", 2000) + `"]}`, 413, "body_too_large"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := send(t, h, http.MethodPost, calculationsPath, tt.contentType, tt.body)
			if rec.Code != tt.status {
				t.Fatalf("status = %d, want %d; body %s", rec.Code, tt.status, rec.Body)
			}
			if p := decodeProblem(t, rec); p.Code != tt.code {
				t.Errorf("code = %q, want %q", p.Code, tt.code)
			}
		})
	}
}

func TestRoutingFailures(t *testing.T) {
	h := newTestHandler(calc.Calculate)
	tests := []struct {
		name   string
		method string
		path   string
		status int
		code   string
	}{
		{"unknown API path", http.MethodPost, "/api/v1/other", 404, "not_found"},
		{"root path", http.MethodGet, "/", 404, "not_found"},
		{"GET on calculations", http.MethodGet, calculationsPath, 405, "method_not_allowed"},
		{"DELETE on calculations", http.MethodDelete, calculationsPath, 405, "method_not_allowed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := send(t, h, tt.method, tt.path, "application/json", "")
			if rec.Code != tt.status {
				t.Fatalf("status = %d, want %d", rec.Code, tt.status)
			}
			if p := decodeProblem(t, rec); p.Code != tt.code {
				t.Errorf("code = %q, want %q", p.Code, tt.code)
			}
			if tt.status == http.StatusMethodNotAllowed && rec.Header().Get("Allow") != http.MethodPost {
				t.Errorf("Allow = %q, want POST", rec.Header().Get("Allow"))
			}
		})
	}
}

func TestUnexpectedErrorsHideInternals(t *testing.T) {
	const secret = "database password is hunter2"
	tests := []struct {
		name      string
		calculate CalculateFunc
	}{
		{"error", func(string, []string) (string, error) { return "", errors.New(secret) }},
		{"panic", func(string, []string) (string, error) { panic(secret) }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := send(t, newTestHandler(tt.calculate), http.MethodPost, calculationsPath,
				"application/json", `{"operation":"add","operands":["1","2"]}`)
			if rec.Code != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", rec.Code)
			}
			if strings.Contains(rec.Body.String(), "hunter2") {
				t.Errorf("body leaks the internal error: %s", rec.Body)
			}
			if p := decodeProblem(t, rec); p.Code != "internal" {
				t.Errorf("code = %q, want internal", p.Code)
			}
		})
	}
}

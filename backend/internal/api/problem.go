package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// Codes for failures detected by the HTTP layer. Calculation failures use calc.Code.
const (
	codeInvalidJSON          = "invalid_json"
	codeUnsupportedMediaType = "unsupported_media_type"
	codeBodyTooLarge         = "body_too_large"
	codeNotFound             = "not_found"
	codeMethodNotAllowed     = "method_not_allowed"
	codeInternal             = "internal"
)

// problem is an RFC 9457 problem details body with a stable code for clients.
type problem struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Code   string `json:"code"`
	Detail string `json:"detail"`
}

func writeProblem(w http.ResponseWriter, logger *slog.Logger, status int, code, detail string) {
	writeJSON(w, logger, "application/problem+json", status, problem{
		Type:   "about:blank",
		Title:  http.StatusText(status),
		Status: status,
		Code:   code,
		Detail: detail,
	})
}

func writeInternalError(w http.ResponseWriter, logger *slog.Logger) {
	writeProblem(w, logger, http.StatusInternalServerError, codeInternal, "something went wrong on the server; please try again")
}

func writeJSON(w http.ResponseWriter, logger *slog.Logger, contentType string, status int, body any) {
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		logger.Error("writing response", "error", err)
	}
}

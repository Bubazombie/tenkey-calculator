// Package api exposes the calculator over HTTP.
package api

import (
	"log/slog"
	"net/http"
)

// CalculateFunc computes one operation. calc.Calculate is the implementation.
type CalculateFunc func(operation string, operands []string) (string, error)

type handler struct {
	calculate CalculateFunc
	logger    *slog.Logger
}

// NewHandler returns the API handler. Every failure, including unknown routes and
// methods, is answered with a problem details body.
func NewHandler(calculate CalculateFunc, logger *slog.Logger) http.Handler {
	h := &handler{calculate: calculate, logger: logger}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculations", h.createCalculation)
	mux.HandleFunc("/api/v1/calculations", h.methodNotAllowed)
	mux.HandleFunc("/", h.notFound)
	return h.recoverPanics(mux)
}

func (h *handler) notFound(w http.ResponseWriter, _ *http.Request) {
	writeProblem(w, h.logger, http.StatusNotFound, codeNotFound, "no resource at this path")
}

func (h *handler) methodNotAllowed(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Allow", http.MethodPost)
	writeProblem(w, h.logger, http.StatusMethodNotAllowed, codeMethodNotAllowed, "this resource only accepts POST")
}

// recoverPanics answers with a generic error instead of dropping the connection.
func (h *handler) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				h.logger.Error("panic while serving request", "panic", v, "path", r.URL.Path)
				writeInternalError(w, h.logger)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

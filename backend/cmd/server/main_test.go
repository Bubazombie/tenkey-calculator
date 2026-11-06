package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func serve(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestNewHandlerRoutesAPIAndFrontend(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<title>Tenkey</title>"), 0o600); err != nil {
		t.Fatal(err)
	}
	h, err := newHandler(dir, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}

	if rec := serve(t, h, http.MethodGet, "/", ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Tenkey") {
		t.Errorf("GET / = %d %q, want the frontend", rec.Code, rec.Body)
	}
	rec := serve(t, h, http.MethodPost, "/api/v1/calculations", `{"operation":"add","operands":["0.1","0.2"]}`)
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != `{"result":"0.3"}` {
		t.Errorf("POST calculation = %d %q", rec.Code, rec.Body)
	}
	for _, path := range []string{"/api/unknown", "/api"} {
		rec = serve(t, h, http.MethodGet, path, "")
		if rec.Code != http.StatusNotFound || rec.Header().Get("Content-Type") != "application/problem+json" {
			t.Errorf("GET %s = %d %q, want a JSON 404", path, rec.Code, rec.Header().Get("Content-Type"))
		}
	}
	if rec := serve(t, h, http.MethodPost, "/", ""); rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST / = %d, want 405", rec.Code)
	}
}

func TestNewHandlerWithoutFrontendServesOnlyTheAPI(t *testing.T) {
	h, err := newHandler("", slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	if rec := serve(t, h, http.MethodGet, "/", ""); rec.Header().Get("Content-Type") != "application/problem+json" {
		t.Errorf("GET / content type = %q, want a JSON 404", rec.Header().Get("Content-Type"))
	}
}

func TestNewHandlerRejectsAMissingFrontendFolder(t *testing.T) {
	if _, err := newHandler(filepath.Join(t.TempDir(), "missing"), slog.Default()); err == nil {
		t.Error("expected an error")
	}
}

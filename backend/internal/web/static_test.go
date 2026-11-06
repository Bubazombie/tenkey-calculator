package web

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const script = "console.log('tenkey'); // long enough to be worth compressing"

func newSite(t *testing.T) http.Handler {
	t.Helper()
	dir := t.TempDir()
	files := map[string]string{
		"index.html":               "<!doctype html><title>Tenkey</title>",
		"assets/index-abc123.js":   strings.Repeat(script, 20),
		"assets/font-abc123.woff2": "wOF2 binary",
		"assets/nested/readme.txt": "not listed",
		"../outside-the-site.txt":  "secret",
	}
	for name, content := range files {
		path := filepath.Join(dir, "site", name)
		if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	handler, err := Static(filepath.Join(dir, "site"))
	if err != nil {
		t.Fatal(err)
	}
	return handler
}

func get(t *testing.T, h http.Handler, path, acceptEncoding string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if acceptEncoding != "" {
		req.Header.Set("Accept-Encoding", acceptEncoding)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestStaticServesFilesWithCachingHeaders(t *testing.T) {
	h := newSite(t)
	tests := []struct {
		path         string
		contentType  string
		cacheControl string
	}{
		{"/", "text/html; charset=utf-8", "no-cache"},
		{"/assets/index-abc123.js", "text/javascript; charset=utf-8", "public, max-age=31536000, immutable"},
		{"/assets/font-abc123.woff2", "font/woff2", "public, max-age=31536000, immutable"},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			rec := get(t, h, tt.path, "")
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", rec.Code)
			}
			if got := rec.Header().Get("Content-Type"); got != tt.contentType {
				t.Errorf("Content-Type = %q, want %q", got, tt.contentType)
			}
			if got := rec.Header().Get("Cache-Control"); got != tt.cacheControl {
				t.Errorf("Cache-Control = %q, want %q", got, tt.cacheControl)
			}
			if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
				t.Errorf("X-Content-Type-Options = %q, want nosniff", got)
			}
			if rec.Header().Get("Content-Encoding") != "" {
				t.Error("compressed for a client that did not ask for it")
			}
		})
	}
}

func TestStaticCompressesTextForClientsThatAcceptGzip(t *testing.T) {
	h := newSite(t)
	rec := get(t, h, "/assets/index-abc123.js", "gzip, deflate, br")
	if rec.Header().Get("Content-Encoding") != "gzip" {
		t.Fatalf("Content-Encoding = %q, want gzip", rec.Header().Get("Content-Encoding"))
	}
	if rec.Header().Get("Vary") != "Accept-Encoding" {
		t.Errorf("Vary = %q, want Accept-Encoding", rec.Header().Get("Vary"))
	}
	if rec.Header().Get("Cache-Control") != "public, max-age=31536000, immutable" {
		t.Errorf("Cache-Control = %q", rec.Header().Get("Cache-Control"))
	}
	reader, err := gzip.NewReader(rec.Body)
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(reader)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(body, []byte(strings.Repeat(script, 20))) {
		t.Error("decompressed body differs from the file")
	}
}

func TestStaticNeverCompressesCompressedFormats(t *testing.T) {
	rec := get(t, newSite(t), "/assets/font-abc123.woff2", "gzip")
	if rec.Header().Get("Content-Encoding") != "" {
		t.Error("woff2 is already compressed")
	}
}

func TestStaticRefusesListingsAndPathsOutsideTheSite(t *testing.T) {
	h := newSite(t)
	for _, path := range []string{"/assets/", "/assets/nested/", "/missing.js", "/../outside-the-site.txt"} {
		t.Run(path, func(t *testing.T) {
			if rec := get(t, h, path, ""); rec.Code != http.StatusNotFound {
				t.Errorf("status = %d, want 404", rec.Code)
			}
		})
	}
}

func TestStaticOnlyAnswersGetAndHead(t *testing.T) {
	h := newSite(t)
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(method, "/", nil))
		if rec.Code != http.StatusMethodNotAllowed || rec.Header().Get("Allow") != "GET, HEAD" {
			t.Errorf("%s / = %d, Allow %q; want 405 with GET, HEAD", method, rec.Code, rec.Header().Get("Allow"))
		}
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodHead, "/", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("HEAD / = %d, want 200", rec.Code)
	}
}

func TestStaticRequiresAnExistingDirectory(t *testing.T) {
	if _, err := Static(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Error("expected an error for a missing directory")
	}
}

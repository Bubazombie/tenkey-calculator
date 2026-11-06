// Package web serves the built frontend.
package web

import (
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
	"time"
)

// Hashed build files never change, so browsers may keep them for a year.
const (
	immutable    = "public, max-age=31536000, immutable"
	revalidate   = "no-cache"
	assetsPrefix = "/assets/"
)

// compressible lists the text formats worth gzipping; fonts and sounds are already compressed.
var compressible = map[string]bool{".html": true, ".js": true, ".css": true, ".svg": true}

type compressed struct {
	body    []byte
	modTime time.Time
}

// Static serves the files in dir: hashed assets with long-term caching,
// everything else revalidated, text gzipped for clients that accept it.
// Text files are compressed once, here, so requests cost no CPU.
func Static(dir string) (http.Handler, error) {
	site := os.DirFS(dir)
	gzipped, err := compressAll(site)
	if err != nil {
		return nil, fmt.Errorf("preparing %s: %w", dir, err)
	}
	files := http.FileServerFS(noListings{site})

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		header := w.Header()
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("Vary", "Accept-Encoding")
		if strings.HasPrefix(r.URL.Path, assetsPrefix) {
			header.Set("Cache-Control", immutable)
		} else {
			header.Set("Cache-Control", revalidate)
		}

		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name == "" {
			name = "index.html"
		}
		if file, ok := gzipped[name]; ok && acceptsGzip(r) {
			header.Set("Content-Encoding", "gzip")
			header.Set("Content-Type", contentType(name))
			http.ServeContent(w, r, name, file.modTime, bytes.NewReader(file.body))
			return
		}
		files.ServeHTTP(w, r)
	}), nil
}

func compressAll(site fs.FS) (map[string]compressed, error) {
	result := map[string]compressed{}
	err := fs.WalkDir(site, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || !compressible[path.Ext(name)] {
			return err
		}
		content, err := fs.ReadFile(site, name)
		if err != nil {
			return err
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		var buf bytes.Buffer
		writer, err := gzip.NewWriterLevel(&buf, gzip.BestCompression)
		if err != nil {
			return err
		}
		if _, err := writer.Write(content); err != nil {
			return err
		}
		if err := writer.Close(); err != nil {
			return err
		}
		result[name] = compressed{body: buf.Bytes(), modTime: info.ModTime()}
		return nil
	})
	return result, err
}

func acceptsGzip(r *http.Request) bool {
	for _, encoding := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		if strings.TrimSpace(strings.SplitN(encoding, ";", 2)[0]) == "gzip" {
			return true
		}
	}
	return false
}

func contentType(name string) string {
	switch path.Ext(name) {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	default:
		return "image/svg+xml"
	}
}

// noListings hides directories that have no index.html, so they are 404s.
type noListings struct{ fs.FS }

func (n noListings) Open(name string) (fs.File, error) {
	file, err := n.FS.Open(name)
	if err != nil {
		return nil, err
	}
	info, err := file.Stat()
	if err != nil || !info.IsDir() {
		return file, err
	}
	index, err := n.FS.Open(path.Join(name, "index.html"))
	if err != nil {
		_ = file.Close()
		return nil, errors.Join(fs.ErrNotExist, err)
	}
	_ = index.Close()
	return file, nil
}

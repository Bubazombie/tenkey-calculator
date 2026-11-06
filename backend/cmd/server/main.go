// Command server runs the calculator API and, optionally, serves the built frontend.
package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tenkey/internal/api"
	"tenkey/internal/calc"
	"tenkey/internal/web"
)

const shutdownTimeout = 5 * time.Second

func main() {
	addr := flag.String("addr", ":8080", "address to listen on")
	static := flag.String("static", "", "folder with the built frontend to serve; empty serves only the API")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	handler, err := newHandler(*static, logger)
	if err == nil {
		err = run(*addr, handler, logger)
	}
	if err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// run serves until it receives an interrupt or termination signal, then lets
// in-flight requests finish.
func run(addr string, handler http.Handler, logger *slog.Logger) error {
	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", addr)
		serveErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// newHandler routes /api/ to the API and, when staticDir is set, everything else
// to the built frontend. Without it, the API answers every path.
func newHandler(staticDir string, logger *slog.Logger) (http.Handler, error) {
	apiHandler := api.NewHandler(calc.Calculate, logger)
	if staticDir == "" {
		return apiHandler, nil
	}
	site, err := web.Static(staticDir)
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	mux.Handle("/api/", apiHandler)
	mux.Handle("/api", apiHandler)
	mux.Handle("/", site)
	return mux, nil
}

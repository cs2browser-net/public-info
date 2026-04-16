package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/cs2browser-net/public-info/internal/db"
	"github.com/cs2browser-net/public-info/internal/metrics"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Printf("warning: could not load .env file: %v", err)
	}

	database := db.GetYBDatabase()

	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("failed to retrieve SQL handle: %v", err)
	}
	defer sqlDB.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dryRun := parseBoolEnv("DRY_RUN")
	if dryRun {
		log.Print("DRY_RUN is enabled; metric writes are skipped and computed values are logged")
	}

	var tickInProgress atomic.Bool

	runTick := func() {
		if !tickInProgress.CompareAndSwap(false, true) {
			return
		}
		defer tickInProgress.Store(false)

		if err := metrics.RunTick(ctx, database, dryRun); err != nil {
			log.Printf("RunTick failed: %v", err)
		}
	}

	runTick()

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Print("shutdown signal received")
			return
		case <-ticker.C:
			go runTick()
		}
	}
}

func parseBoolEnv(key string) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return false
	}

	value, err := strconv.ParseBool(raw)
	if err == nil {
		return value
	}

	switch strings.ToLower(raw) {
	case "on", "yes", "y", "enabled":
		return true
	case "off", "no", "n", "disabled":
		return false
	default:
		log.Printf("warning: invalid %s value %q, defaulting to false", key, raw)
		return false
	}
}

package metrics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/cs2browser-net/public-info/internal/models"
	"github.com/cs2browser-net/public-info/internal/utils"
	"gorm.io/gorm"
)

func emptyMetricsRow() *models.Metrics {
	return &models.Metrics{
		ID:                   1,
		CheckedLast24Hours:   models.JSONIntMap{},
		CheckedLast7Days:     models.JSONIntMap{},
		CheckedLast30Days:    models.JSONIntMap{},
		PrefilterLast24Hours: models.JSONIntMap{},
		PrefilterLast7Days:   models.JSONIntMap{},
		PrefilterLast30Days:  models.JSONIntMap{},
		PlayersLast24Hours:   models.JSONIntMap{},
		PlayersLast7Days:     models.JSONIntMap{},
		PlayersLast30Days:    models.JSONIntMap{},
	}
}

func getMetricsRowOrEmpty(ctx context.Context, database *gorm.DB) (*models.Metrics, error) {
	var row models.Metrics
	err := database.WithContext(ctx).Where(`"ID" = ?`, 1).Take(&row).Error
	if err == nil {
		sanitizeMetricsRow(&row)
		return &row, nil
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return emptyMetricsRow(), nil
	}

	return nil, fmt.Errorf("load metrics row: %w", err)
}

func ensureMetricsRow(ctx context.Context, database *gorm.DB) (*models.Metrics, error) {
	var row models.Metrics
	err := database.WithContext(ctx).Where(`"ID" = ?`, 1).Take(&row).Error
	if err == nil {
		sanitizeMetricsRow(&row)
		return &row, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("load metrics row: %w", err)
	}

	row = *emptyMetricsRow()

	if err := database.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("create metrics row: %w", err)
	}

	return &row, nil
}

func logDryRunValues(processName string, values map[string]any) {
	payload, err := json.MarshalIndent(values, "", "  ")
	if err != nil {
		log.Printf("[dry-run] %s computed values (fallback output): %+v", processName, values)
		return
	}

	log.Printf("[dry-run] %s computed values:\n%s", processName, string(payload))
}

func sanitizeMetricsRow(row *models.Metrics) {
	if row.CheckedLast24Hours == nil {
		row.CheckedLast24Hours = models.JSONIntMap{}
	}
	if row.CheckedLast7Days == nil {
		row.CheckedLast7Days = models.JSONIntMap{}
	}
	if row.CheckedLast30Days == nil {
		row.CheckedLast30Days = models.JSONIntMap{}
	}
	if row.PrefilterLast24Hours == nil {
		row.PrefilterLast24Hours = models.JSONIntMap{}
	}
	if row.PrefilterLast7Days == nil {
		row.PrefilterLast7Days = models.JSONIntMap{}
	}
	if row.PrefilterLast30Days == nil {
		row.PrefilterLast30Days = models.JSONIntMap{}
	}
	if row.PlayersLast24Hours == nil {
		row.PlayersLast24Hours = models.JSONIntMap{}
	}
	if row.PlayersLast7Days == nil {
		row.PlayersLast7Days = models.JSONIntMap{}
	}
	if row.PlayersLast30Days == nil {
		row.PlayersLast30Days = models.JSONIntMap{}
	}
}

func initHourWindow(now time.Time, hours int) models.JSONIntMap {
	window := make(models.JSONIntMap, hours)
	end := utils.TruncateToHour(now)
	start := end.Add(-time.Duration(hours-1) * time.Hour)

	for i := 0; i < hours; i++ {
		key := utils.FormatHourKey(start.Add(time.Duration(i) * time.Hour))
		window[key] = 0
	}

	return window
}

func initDayWindow(now time.Time, days int) models.JSONIntMap {
	window := make(models.JSONIntMap, days)
	end := utils.TruncateToDay(now)
	start := end.AddDate(0, 0, -(days - 1))

	for i := 0; i < days; i++ {
		key := utils.FormatDayKey(start.AddDate(0, 0, i))
		window[key] = 0
	}

	return window
}

func copyWindowValues(target models.JSONIntMap, source models.JSONIntMap) {
	if source == nil {
		return
	}

	for key := range target {
		target[key] = source[key]
	}
}

func mergeWindowCounts(target models.JSONIntMap, source models.JSONIntMap) {
	if source == nil {
		return
	}

	for key, value := range source {
		if _, ok := target[key]; ok {
			target[key] += value
		}
	}
}

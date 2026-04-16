package metrics

import (
	"context"
	"fmt"
	"time"

	"github.com/cs2browser-net/public-info/internal/models"
	"github.com/cs2browser-net/public-info/internal/utils"
	"gorm.io/gorm"
)

func PrefilterProcess(ctx context.Context, database *gorm.DB, dryRun bool) error {
	var totalPrefiltered int64
	if err := database.WithContext(ctx).
		Model(&models.Server{}).
		Where(`"Status" >= ?`, 2).
		Where(`"LastUpdated" IS NULL`).
		Count(&totalPrefiltered).Error; err != nil {
		return fmt.Errorf("count prefiltered servers: %w", err)
	}

	metricsRow, err := getMetricsRowOrEmpty(ctx, database)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	currentHourKey := utils.FormatHourKey(utils.TruncateToHour(now))
	currentDayKey := utils.FormatDayKey(utils.TruncateToDay(now))

	new24 := initHourWindow(now, 24)
	new7 := initDayWindow(now, 7)
	new30 := initDayWindow(now, 30)

	copyWindowValues(new24, metricsRow.PrefilterLast24Hours)
	copyWindowValues(new7, metricsRow.PrefilterLast7Days)
	copyWindowValues(new30, metricsRow.PrefilterLast30Days)

	currentValue := int(totalPrefiltered)
	new24[currentHourKey] = currentValue
	new7[currentDayKey] = currentValue
	new30[currentDayKey] = currentValue

	if dryRun {
		logDryRunValues("PrefilterProcess", map[string]any{
			"PrefilterLast24Hours": new24,
			"PrefilterLast7Days":   new7,
			"PrefilterLast30Days":  new30,
		})
		return nil
	}

	if err := updateMetricJSONColumns(ctx, database, map[string]models.JSONIntMap{
		"PrefilterLast24Hours": new24,
		"PrefilterLast7Days":   new7,
		"PrefilterLast30Days":  new30,
	}); err != nil {
		return fmt.Errorf("update prefilter metrics: %w", err)
	}

	return nil
}

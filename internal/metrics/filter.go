package metrics

import (
	"context"
	"fmt"
	"time"

	"github.com/cs2browser-net/public-info/internal/models"
	"github.com/cs2browser-net/public-info/internal/utils"
	"gorm.io/gorm"
)

func FilterProcess(ctx context.Context, database *gorm.DB, dryRun bool) error {
	thirtyDaysAgo := time.Now().UTC().Add(-30 * 24 * time.Hour)

	filteredRows := make([]models.Server, 0)
	if err := database.WithContext(ctx).
		Model(&models.Server{}).
		Where(`"LastUpdated" >= ?`, thirtyDaysAgo).
		Where(`"Status" >= ?`, 2).
		Where(`"Status" NOT IN ?`, []int{5, 9}).
		Find(&filteredRows).Error; err != nil {
		return fmt.Errorf("query filtered servers: %w", err)
	}

	now := time.Now().UTC()
	checked24 := initHourWindow(now, 24)
	checked7 := initDayWindow(now, 7)
	checked30 := initDayWindow(now, 30)

	cutoff24 := now.Add(-24 * time.Hour)
	cutoff7 := utils.TruncateToDay(now).AddDate(0, 0, -6)
	cutoff30 := utils.TruncateToDay(now).AddDate(0, 0, -29)

	for _, row := range filteredRows {
		if row.LastUpdated == nil {
			continue
		}

		updatedAt := row.LastUpdated.UTC()

		if !updatedAt.Before(cutoff24) {
			hourKey := utils.FormatHourKey(utils.TruncateToHour(updatedAt))
			if _, ok := checked24[hourKey]; ok {
				checked24[hourKey]++
			}
		}

		dayKey := utils.FormatDayKey(utils.TruncateToDay(updatedAt))
		if !updatedAt.Before(cutoff7) {
			if _, ok := checked7[dayKey]; ok {
				checked7[dayKey]++
			}
		}

		if !updatedAt.Before(cutoff30) {
			if _, ok := checked30[dayKey]; ok {
				checked30[dayKey]++
			}
		}
	}

	if dryRun {
		logDryRunValues("FilterProcess", map[string]any{
			"CheckedLast24Hours": checked24,
			"CheckedLast7Days":   checked7,
			"CheckedLast30Days":  checked30,
		})
		return nil
	}

	if _, err := ensureMetricsRow(ctx, database); err != nil {
		return err
	}

	if err := database.WithContext(ctx).
		Model(&models.Metrics{}).
		Where(`"ID" = ?`, 1).
		Updates(map[string]any{
			"CheckedLast24Hours": checked24,
			"CheckedLast7Days":   checked7,
			"CheckedLast30Days":  checked30,
		}).Error; err != nil {
		return fmt.Errorf("update filtered metrics: %w", err)
	}

	return nil
}

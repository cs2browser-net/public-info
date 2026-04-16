package metrics

import (
	"context"
	"fmt"
	"time"

	"github.com/cs2browser-net/public-info/internal/models"
	"gorm.io/gorm"
)

func PlayersProcess(ctx context.Context, database *gorm.DB, dryRun bool) error {
	thirtyDaysAgo := time.Now().UTC().Add(-30 * 24 * time.Hour)

	playerRows := make([]models.PlayersData, 0)
	if err := database.WithContext(ctx).
		Model(&models.PlayersData{}).
		Where(`"Timestamp" >= ?`, thirtyDaysAgo).
		Find(&playerRows).Error; err != nil {
		return fmt.Errorf("query player rows: %w", err)
	}

	now := time.Now().UTC()
	players24 := initHourWindow(now, 24)
	players7 := initDayWindow(now, 7)
	players30 := initDayWindow(now, 30)

	for _, row := range playerRows {
		mergeWindowCounts(players24, row.MaxLast24Hours)
		mergeWindowCounts(players7, row.MaxLast7Days)
		mergeWindowCounts(players30, row.MaxLast30Days)
	}

	if dryRun {
		logDryRunValues("PlayersProcess", map[string]any{
			"PlayersLast24Hours": players24,
			"PlayersLast7Days":   players7,
			"PlayersLast30Days":  players30,
		})
		return nil
	}

	if err := updateMetricJSONColumns(ctx, database, map[string]models.JSONIntMap{
		"PlayersLast24Hours": players24,
		"PlayersLast7Days":   players7,
		"PlayersLast30Days":  players30,
	}); err != nil {
		return fmt.Errorf("update player metrics: %w", err)
	}

	return nil
}

package metrics

import (
	"context"

	"gorm.io/gorm"
)

func RunTick(ctx context.Context, database *gorm.DB, dryRun bool) error {
	if err := PrefilterProcess(ctx, database, dryRun); err != nil {
		return err
	}
	if err := FilterProcess(ctx, database, dryRun); err != nil {
		return err
	}
	if err := PlayersProcess(ctx, database, dryRun); err != nil {
		return err
	}

	return nil
}

package utils

import "time"

func FormatHourKey(t time.Time) string {
	return t.UTC().Format("2006-01-02 15:00:00")
}

func FormatDayKey(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

func TruncateToHour(t time.Time) time.Time {
	utc := t.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
}

func TruncateToDay(t time.Time) time.Time {
	utc := t.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
}

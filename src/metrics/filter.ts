import { formatDayKey, formatHourKey, setDateTimeFromDbString, truncateToDayInPlace, truncateToHourInPlace } from "../utils/formatting";
import { db } from "../db/drizzle"
import { metrics, server } from "../../generated/drizzle/schema";
import { and, eq, gte, notInArray } from "drizzle-orm";

export async function FilterProcess() {
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filteredRows = await db.select().from(server).where(
        and(
            gte(server.lastUpdated, thirtyDaysAgo.toISOString()),
            gte(server.status, 2),
            notInArray(server.status, [5, 9])
        )
    )

    const now = new Date();
    const truncatedHourNow = truncateToHourInPlace(new Date(), now);
    const truncatedDayNow = truncateToDayInPlace(new Date(), now);

    const checked24: Record<string, number> = {};
    const chStartMs = truncatedHourNow.getTime() - 23 * HOUR_MS;
    const temporaryChStartDate = new Date(chStartMs);
    for (let i = 0; i < 24; i++) {
        temporaryChStartDate.setTime(chStartMs + i * HOUR_MS);
        const k = formatHourKey(temporaryChStartDate);
        checked24[k] = 0;
    }

    const checked7: Record<string, number> = {};
    const ch7StartMs = truncatedDayNow.getTime() - 6 * DAY_MS;
    const temporaryCh7StartDate = new Date(ch7StartMs);
    for (let i = 0; i < 7; i++) {
        temporaryCh7StartDate.setTime(ch7StartMs + i * DAY_MS);
        const k = formatDayKey(temporaryCh7StartDate);
        checked7[k] = 0;
    }

    const checked30: Record<string, number> = {};
    const ch30StartMs = truncatedDayNow.getTime() - 29 * DAY_MS;
    const temporaryCh30StartDate = new Date(ch30StartMs);
    for (let i = 0; i < 30; i++) {
        temporaryCh30StartDate.setTime(ch30StartMs + i * DAY_MS);
        const k = formatDayKey(temporaryCh30StartDate);
        checked30[k] = 0;
    }

    const cutoff24Ms = now.getTime() - DAY_MS;
    const cutoff7Ms = truncatedDayNow.getTime() - 6 * DAY_MS;
    const cutoff30Ms = truncatedDayNow.getTime() - 29 * DAY_MS;
    const filteredRowDate = new Date();
    const truncatedFilteredHourDate = new Date();
    const truncatedFilteredDayDate = new Date();

    for (const r of filteredRows) {
        setDateTimeFromDbString(filteredRowDate, r.lastUpdated!);
        const filteredRowMs = filteredRowDate.getTime();

        if (filteredRowMs >= cutoff24Ms) {
            const hk = formatHourKey(truncateToHourInPlace(truncatedFilteredHourDate, filteredRowDate));
            if (hk in checked24) {
                checked24[hk]++;
            }
        }

        const dk = formatDayKey(truncateToDayInPlace(truncatedFilteredDayDate, filteredRowDate));
        if (filteredRowMs >= cutoff7Ms) {
            if (dk in checked7) {
                checked7[dk]++;
            }
        }

        if (filteredRowMs >= cutoff30Ms) {
            if (dk in checked30) {
                checked30[dk]++;
            }
        }
    }

    await db.update(metrics).set({
        checkedLast24Hours: checked24,
        checkedLast7Days: checked7,
        checkedLast30Days: checked30
    }).where(eq(metrics.id, 1));
}
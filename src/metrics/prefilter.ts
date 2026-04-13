import { formatDayKey, formatHourKey, truncateToDayInPlace, truncateToHourInPlace } from "../utils/formatting";
import { db } from "../db/drizzle"
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { metrics, server } from "../../generated/drizzle/schema";

export async function PrefilterProcess() {
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;
    const totalPrefiltered = (await db.select({ count: count() }).from(server).where(
        and(
            gte(server.status, 2),
            isNull(server.lastUpdated)
        )
    ))[0].count;

    const metricsRow = (await db.select({
        prefilterLast24h: metrics.prefilterLast24Hours,
        prefilterLast7d: metrics.prefilterLast7Days,
        prefilterLast30d: metrics.prefilterLast30Days
    }).from(metrics).limit(1))[0]

    const prefilterLast24h: any = metricsRow!.prefilterLast24h
    const prefilterLast7d: any = metricsRow!.prefilterLast7d
    const prefilterLast30d: any = metricsRow!.prefilterLast30d

    const now = new Date();
    const truncatedHourNow = truncateToHourInPlace(new Date(), now);
    const truncatedDayNow = truncateToDayInPlace(new Date(), now);
    const hourStartMs = truncatedHourNow.getTime() - 23 * HOUR_MS;

    const new24: Record<string, number> = {};
    const temporaryHourDate = new Date(hourStartMs);

    for (let i = 0; i < 24; i++) {
        temporaryHourDate.setTime(hourStartMs + i * HOUR_MS);
        const k = formatHourKey(temporaryHourDate);

        if (prefilterLast24h[k]) {
            new24[k] = prefilterLast24h[k];
        } else {
            new24[k] = 0;
        }
    }

    const currHourKey = formatHourKey(truncatedHourNow);
    new24[currHourKey] = totalPrefiltered;

    const dayStart7Ms = truncatedDayNow.getTime() - 6 * DAY_MS;
    const new7: Record<string, number> = {};
    const temporaryDay7Date = new Date(dayStart7Ms);

    for (let i = 0; i < 7; i++) {
        temporaryDay7Date.setTime(dayStart7Ms + i * DAY_MS);
        const k = formatDayKey(temporaryDay7Date);

        if (prefilterLast7d[k]) {
            new7[k] = prefilterLast7d[k];
        } else {
            new7[k] = 0;
        }
    }

    const currDayKey = formatDayKey(truncatedDayNow);
    new7[currDayKey] = totalPrefiltered;

    const dayStart30Ms = truncatedDayNow.getTime() - 29 * DAY_MS;
    const new30: Record<string, number> = {};
    const temporaryDay30Date = new Date(dayStart30Ms);

    for (let i = 0; i < 30; i++) {
        temporaryDay30Date.setTime(dayStart30Ms + i * DAY_MS);
        const k = formatDayKey(temporaryDay30Date);

        if (prefilterLast30d[k]) {
            new30[k] = prefilterLast30d[k];
        } else {
            new30[k] = 0;
        }
    }

    new30[currDayKey] = totalPrefiltered;

    await db.update(metrics).set({
        prefilterLast24Hours: new24,
        prefilterLast7Days: new7,
        prefilterLast30Days: new30
    }).where(eq(metrics.id, 1));
}
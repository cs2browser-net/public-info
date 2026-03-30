import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";
import { db } from "../db/drizzle"
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { metrics, server } from "../../generated/drizzle/schema";

export async function PrefilterProcess() {
    const totalPrefiltered = (await db.select({ count: count() }).from(server).where(
        and(
            gte(server.status, 2),
            isNull(server.lastUpdated)
        )
    ))[0].count;

    let metricsRow = (await db.select({
        prefilterLast24h: metrics.prefilterLast24Hours,
        prefilterLast7d: metrics.prefilterLast7Days,
        prefilterLast30d: metrics.prefilterLast30Days
    }).from(metrics).limit(1))[0]

    const prefilterLast24h: any = metricsRow!.prefilterLast24h
    const prefilterLast7d: any = metricsRow!.prefilterLast7d
    const prefilterLast30d: any = metricsRow!.prefilterLast30d

    const now = new Date();
    const hourStart = new Date(truncateToHour(now).getTime() - 23 * 60 * 60 * 1000);

    const new24: Record<string, number> = {};

    for (let i = 0; i < 24; i++) {
        const d = new Date(hourStart.getTime() + i * 60 * 60 * 1000);
        const k = formatHourKey(d);

        if (prefilterLast24h[k]) {
            new24[k] = prefilterLast24h[k];
        } else {
            new24[k] = 0;
        }
    }

    const currHourKey = formatHourKey(truncateToHour(now));
    new24[currHourKey] = totalPrefiltered;

    const dayStart7 = new Date(truncateToDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
    const new7: Record<string, number> = {};

    for (let i = 0; i < 7; i++) {
        const d = new Date(dayStart7.getTime() + i * 24 * 60 * 60 * 1000);
        const k = formatDayKey(d);

        if (prefilterLast7d[k]) {
            new7[k] = prefilterLast7d[k];
        } else {
            new7[k] = 0;
        }
    }

    const currDayKey = formatDayKey(truncateToDay(now));
    new7[currDayKey] = totalPrefiltered;

    const dayStart30 = new Date(truncateToDay(now).getTime() - 29 * 24 * 60 * 60 * 1000);
    const new30: Record<string, number> = {};

    for (let i = 0; i < 30; i++) {
        const d = new Date(dayStart30.getTime() + i * 24 * 60 * 60 * 1000);
        const k = formatDayKey(d);

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
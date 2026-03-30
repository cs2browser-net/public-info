import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";
import { db } from "../db/drizzle"
import { metrics, server } from "../../generated/drizzle/schema";
import { and, eq, gte, notInArray } from "drizzle-orm";

export async function FilterProcess() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filteredRows = await db.select().from(server).where(
        and(
            gte(server.lastUpdated, thirtyDaysAgo.toISOString()),
            gte(server.status, 2),
            notInArray(server.status, [5, 9])
        )
    )

    const now = new Date();

    const checked24: Record<string, number> = {};
    const chStart = new Date(truncateToHour(now).getTime() - 23 * 60 * 60 * 1000);
    for (let i = 0; i < 24; i++) {
        const d = new Date(chStart.getTime() + i * 60 * 60 * 1000);
        const k = formatHourKey(d);
        checked24[k] = 0;
    }

    const checked7: Record<string, number> = {};
    const ch7Start = new Date(truncateToDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 7; i++) {
        const d = new Date(ch7Start.getTime() + i * 24 * 60 * 60 * 1000);
        const k = formatDayKey(d);
        checked7[k] = 0;
    }

    const checked30: Record<string, number> = {};
    const ch30Start = new Date(truncateToDay(now).getTime() - 29 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 30; i++) {
        const d = new Date(ch30Start.getTime() + i * 24 * 60 * 60 * 1000);
        const k = formatDayKey(d);
        checked30[k] = 0;
    }

    const cutoff24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cutoff7 = new Date(truncateToDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
    const cutoff30 = new Date(truncateToDay(now).getTime() - 29 * 24 * 60 * 60 * 1000);

    for (const r of filteredRows) {
        const t = new Date(r.lastUpdated!);

        if (t >= cutoff24) {
            const hk = formatHourKey(truncateToHour(t));
            if (hk in checked24) {
                checked24[hk]++;
            }
        }

        const dk = formatDayKey(truncateToDay(t));
        if (t >= cutoff7) {
            if (dk in checked7) {
                checked7[dk]++;
            }
        }

        if (t >= cutoff30) {
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
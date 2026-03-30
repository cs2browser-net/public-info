import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";
import { db } from "../db/drizzle"
import { metrics, playersData } from "../../generated/drizzle/schema";
import { eq, gte } from "drizzle-orm";

export async function PlayersProcess() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const playerRows = await db.select().from(playersData).where(gte(playersData.timestamp, thirtyDaysAgo.toISOString()));

    const now = new Date();

    const players24: Record<string, number> = {};
    const plStart = new Date(truncateToHour(now).getTime() - 23 * 60 * 60 * 1000);
    for (let i = 0; i < 24; i++) {
        const d = new Date(plStart.getTime() + i * 60 * 60 * 1000);
        const k = formatHourKey(d);
        players24[k] = 0;
    }

    const players7: Record<string, number> = {};
    const pl7Start = new Date(truncateToDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 7; i++) {
        const d = new Date(pl7Start.getTime() + i * 24 * 60 * 60 * 1000);
        const k = formatDayKey(d);
        players7[k] = 0;
    }

    const players30: Record<string, number> = {};
    const pl30Start = new Date(truncateToDay(now).getTime() - 29 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 30; i++) {
        const d = new Date(pl30Start.getTime() + i * 24 * 60 * 60 * 1000);
        const k = formatDayKey(d);
        players30[k] = 0;
    }

    for (const pr of playerRows) {
        try {
            const data24: any = pr.maxLast24Hours;
            for (const [timeKey, playerCount] of Object.entries(data24)) {
                if (timeKey in players24) {
                    players24[timeKey] += playerCount as any;
                }
            }
        } catch (e) { }

        try {
            const data7: any = pr.maxLast7Days;
            for (const [timeKey, playerCount] of Object.entries(data7)) {
                if (timeKey in players7) {
                    players7[timeKey] += playerCount as any;
                }
            }
        } catch (e) { }

        try {
            const data30: any = pr.maxLast30Days;
            for (const [timeKey, playerCount] of Object.entries(data30)) {
                if (timeKey in players30) {
                    players30[timeKey] += playerCount as any;
                }
            }
        } catch (e) { }
    }

    await db.update(metrics).set({
        playersLast24Hours: players24,
        playersLast7Days: players7,
        playersLast30Days: players30
    }).where(eq(metrics.id, 1));
}
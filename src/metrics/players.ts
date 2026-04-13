import { formatDayKey, formatHourKey, truncateToDayInPlace, truncateToHourInPlace } from "../utils/formatting";
import { db } from "../db/drizzle"
import { metrics, playersData } from "../../generated/drizzle/schema";
import { eq, gte } from "drizzle-orm";

export async function PlayersProcess() {
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const playerRows = await db.select().from(playersData).where(gte(playersData.timestamp, thirtyDaysAgo.toISOString()));

    const now = new Date();
    const truncatedHourNow = truncateToHourInPlace(new Date(), now);
    const truncatedDayNow = truncateToDayInPlace(new Date(), now);

    const players24: Record<string, number> = {};
    const plStartMs = truncatedHourNow.getTime() - 23 * HOUR_MS;
    const temporaryPlStartDate = new Date(plStartMs);
    for (let i = 0; i < 24; i++) {
        temporaryPlStartDate.setTime(plStartMs + i * HOUR_MS);
        const k = formatHourKey(temporaryPlStartDate);
        players24[k] = 0;
    }

    const players7: Record<string, number> = {};
    const pl7StartMs = truncatedDayNow.getTime() - 6 * DAY_MS;
    const temporaryPl7StartDate = new Date(pl7StartMs);
    for (let i = 0; i < 7; i++) {
        temporaryPl7StartDate.setTime(pl7StartMs + i * DAY_MS);
        const k = formatDayKey(temporaryPl7StartDate);
        players7[k] = 0;
    }

    const players30: Record<string, number> = {};
    const pl30StartMs = truncatedDayNow.getTime() - 29 * DAY_MS;
    const temporaryPl30StartDate = new Date(pl30StartMs);
    for (let i = 0; i < 30; i++) {
        temporaryPl30StartDate.setTime(pl30StartMs + i * DAY_MS);
        const k = formatDayKey(temporaryPl30StartDate);
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
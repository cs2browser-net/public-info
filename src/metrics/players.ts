import { prisma } from "../db/prisma";
import { DoQuery } from "../db/mysql";
import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";

export async function PlayersProcess() {
    const playerRows = await DoQuery("SELECT max_last_24_hours, max_last_7_days, max_last_30_days, timestamp FROM players_data WHERE timestamp IS NOT NULL AND timestamp >= (UTC_TIMESTAMP() - INTERVAL 30 DAY)", []);

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
        if (pr.max_last_24_hours != null && pr.max_last_24_hours !== "") {
            try {
                const data24: Record<string, number> = JSON.parse(pr.max_last_24_hours);
                for (const [timeKey, playerCount] of Object.entries(data24)) {
                    if (timeKey in players24) {
                        players24[timeKey] += playerCount;
                    }
                }
            } catch (e) { }
        }

        if (pr.max_last_7_days != null && pr.max_last_7_days !== "") {
            try {
                const data7: Record<string, number> = JSON.parse(pr.max_last_7_days);
                for (const [timeKey, playerCount] of Object.entries(data7)) {
                    if (timeKey in players7) {
                        players7[timeKey] += playerCount;
                    }
                }
            } catch (e) { }
        }

        if (pr.max_last_30_days != null && pr.max_last_30_days !== "") {
            try {
                const data30: Record<string, number> = JSON.parse(pr.max_last_30_days);
                for (const [timeKey, playerCount] of Object.entries(data30)) {
                    if (timeKey in players30) {
                        players30[timeKey] += playerCount;
                    }
                }
            } catch (e) { }
        }
    }

    await DoQuery("UPDATE metrics SET players_last_24h = ?, players_last_7d = ?, players_last_30d = ? WHERE id = 1", [
        JSON.stringify(players24),
        JSON.stringify(players7),
        JSON.stringify(players30)
    ]);

    await prisma.metrics.update({
        where: { ID: 1 },
        data: {
            PlayersLast24Hours: players24,
            PlayersLast7Days: players7,
            PlayersLast30Days: players30
        }
    });
}
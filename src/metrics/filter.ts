import { prisma } from "../db/prisma"
import { DoQuery } from "../db/mysql";
import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";

export async function FilterProcess() {
    const filteredRows = await DoQuery("SELECT last_updated FROM ip_list WHERE last_updated IS NOT NULL AND last_updated >= (UTC_TIMESTAMP() - INTERVAL 30 DAY) AND status >= 2 AND status != 5 AND status != 9", []);

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
        const t = new Date(r.last_updated);

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

    await DoQuery("UPDATE metrics SET checked_last_24h = ?, checked_last_7d = ?, checked_last_30d = ? WHERE id = 1", [
        JSON.stringify(checked24),
        JSON.stringify(checked7),
        JSON.stringify(checked30)
    ]);

    await prisma.metrics.update({
        where: { ID: 1 },
        data: {
            CheckedLast24Hours: checked24,
            CheckedLast7Days: checked7,
            CheckedLast30Days: checked30
        }
    })
}
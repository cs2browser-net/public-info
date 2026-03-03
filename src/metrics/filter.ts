import { prisma } from "../db/prisma"
import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";

export async function FilterProcess() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filteredRows = await prisma.server.findMany({
        where: {
            LastUpdated: {
                gte: thirtyDaysAgo
            },
            Status: {
                gte: 2,
                notIn: [5, 9]
            }
        }
    });

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
        const t = r.LastUpdated!;

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

    await prisma.metrics.update({
        where: { ID: 1 },
        data: {
            CheckedLast24Hours: checked24,
            CheckedLast7Days: checked7,
            CheckedLast30Days: checked30
        }
    })
}
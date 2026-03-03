import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";
import { prisma } from "../db/prisma"

export async function PrefilterProcess() {
    const totalPrefiltered = await prisma.server.count({
        where: {
            Status: {
                gte: 2,
            },
            LastUpdated: {
                equals: null
            }
        }
    })

    let metricsRow = await prisma.metrics.findFirst({
        select: {
            PrefilterLast24Hours: true,
            PrefilterLast7Days: true,
            PrefilterLast30Days: true
        }
    })

    const prefilterLast24h: any = metricsRow!.PrefilterLast24Hours
    const prefilterLast7d: any = metricsRow!.PrefilterLast7Days
    const prefilterLast30d: any = metricsRow!.PrefilterLast30Days

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

    await prisma.metrics.update({
        where: {
            ID: 1
        },
        data: {
            PrefilterLast24Hours: new24,
            PrefilterLast7Days: new7,
            PrefilterLast30Days: new30
        }
    })
}
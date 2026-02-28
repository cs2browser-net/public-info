import { formatDayKey, formatHourKey, truncateToDay, truncateToHour } from "../utils/formatting";
import { DoQuery } from "../db/mysql"
import { prisma } from "../db/prisma"

export async function PrefilterProcess() {
    const prefilteredRows = await DoQuery("SELECT COUNT(*) FROM ip_list WHERE status >= 2 AND last_updated IS NULL");
    const totalPrefiltered = prefilteredRows[0]["COUNT(*)"];

    let metricsRow = (await DoQuery("SELECT prefilter_last_24h, prefilter_last_7d, prefilter_last_30d FROM metrics WHERE id = 1 LIMIT 1"))[0];

    metricsRow.prefilter_last_24h = JSON.parse(metricsRow.prefilter_last_24h);
    metricsRow.prefilter_last_7d = JSON.parse(metricsRow.prefilter_last_7d);
    metricsRow.prefilter_last_30d = JSON.parse(metricsRow.prefilter_last_30d);

    const now = new Date();
    const hourStart = new Date(truncateToHour(now).getTime() - 23 * 60 * 60 * 1000);

    const new24: Record<string, number> = {};

    for (let i = 0; i < 24; i++) {
        const d = new Date(hourStart.getTime() + i * 60 * 60 * 1000);
        const k = formatHourKey(d);

        if (metricsRow.prefilter_last_24h[k]) {
            new24[k] = metricsRow.prefilter_last_24h[k];
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

        if (metricsRow.prefilter_last_7d[k]) {
            new7[k] = metricsRow.prefilter_last_7d[k];
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

        if (metricsRow.prefilter_last_30d[k]) {
            new30[k] = metricsRow.prefilter_last_30d[k];
        } else {
            new30[k] = 0;
        }
    }

    new30[currDayKey] = totalPrefiltered;

    metricsRow.prefilter_last_24h = JSON.stringify(new24)
    metricsRow.prefilter_last_7d = JSON.stringify(new7)
    metricsRow.prefilter_last_30d = JSON.stringify(new30)

    await DoQuery("UPDATE metrics SET prefilter_last_24h = ?, prefilter_last_7d = ?, prefilter_last_30d = ? WHERE id = 1", [
        metricsRow.prefilter_last_24h,
        metricsRow.prefilter_last_7d,
        metricsRow.prefilter_last_30d
    ]);

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
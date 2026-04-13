export const pad2 = (n: number) => String(n).padStart(2, "0");
export const formatHourKey = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    return `${yyyy}-${mm}-${dd} ${hh}:00:00`;
};

export const formatDayKey = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
};

export const truncateToHourInPlace = (target: Date, source: Date): Date => {
    target.setFullYear(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate());
    target.setHours(source.getUTCHours(), 0, 0, 0);
    return target;
};

export const truncateToDayInPlace = (target: Date, source: Date): Date => {
    target.setFullYear(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate());
    target.setHours(0, 0, 0, 0);
    return target;
};

export const truncateToHour = (d: Date): Date =>
    truncateToHourInPlace(new Date(), d);

export const truncateToDay = (d: Date): Date =>
    truncateToDayInPlace(new Date(), d);

export const setDateTimeFromDbString = (date: Date, str: string) => {
    const y =
        (str.charCodeAt(0) - 48) * 1000 +
        (str.charCodeAt(1) - 48) * 100 +
        (str.charCodeAt(2) - 48) * 10 +
        (str.charCodeAt(3) - 48);

    const mo =
        (str.charCodeAt(5) - 48) * 10 +
        (str.charCodeAt(6) - 48) - 1;

    const d =
        (str.charCodeAt(8) - 48) * 10 +
        (str.charCodeAt(9) - 48);

    const h =
        (str.charCodeAt(11) - 48) * 10 +
        (str.charCodeAt(12) - 48);

    const mi =
        (str.charCodeAt(14) - 48) * 10 +
        (str.charCodeAt(15) - 48);

    const s =
        (str.charCodeAt(17) - 48) * 10 +
        (str.charCodeAt(18) - 48);

    const ms =
        (str.charCodeAt(20) - 48) * 100 +
        (str.charCodeAt(21) - 48) * 10 +
        (str.charCodeAt(22) - 48);

    date.setFullYear(y, mo, d);
    date.setHours(h, mi, s, ms);
}
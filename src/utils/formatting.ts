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

export const truncateToHour = (d: Date): Date =>
    new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0);

export const truncateToDay = (d: Date): Date =>
    new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
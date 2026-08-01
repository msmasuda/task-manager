const TOKYO_OFFSET = "+09:00";

export function localDateTime(date: string, time: string, addDay = false) {
  const base = new Date(`${date}T${time}:00${TOKYO_OFFSET}`);
  if (addDay) base.setUTCDate(base.getUTCDate() + 1);
  return base;
}

export function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function previousDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function windowsForDate(
  date: string,
  current: Array<{ startTime: string; endTime: string }>,
  previous: Array<{ startTime: string; endTime: string }>,
) {
  const windows = current.map((hour) => ({
    start: localDateTime(date, hour.startTime),
    end: localDateTime(date, hour.endTime, hour.endTime <= hour.startTime),
  }));
  const previousDay = previousDate(date);
  for (const hour of previous.filter((item) => item.endTime <= item.startTime)) {
    windows.push({ start: localDateTime(previousDay, hour.startTime), end: localDateTime(date, hour.endTime) });
  }
  return windows;
}

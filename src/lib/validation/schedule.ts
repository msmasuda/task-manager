import { z } from "zod";

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "時刻はHH:mm形式で入力してください。");

export const businessHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
}).refine(({ startTime, endTime }) => startTime !== endTime, "開始時刻と終了時刻は異なる時刻にしてください。");

export const scheduleExceptionSchema = z.object({
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付を選択してください。"),
  type: z.enum(["CLOSED", "SPECIAL_HOURS"]),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  note: z.string().trim().max(200).optional().default(""),
}).superRefine((value, context) => {
  if (value.type === "SPECIAL_HOURS") {
    if (!time.safeParse(value.startTime).success || !time.safeParse(value.endTime).success || value.startTime === value.endTime) {
      context.addIssue({ code: "custom", message: "臨時営業時間の開始・終了時刻を正しく入力してください。" });
    }
  }
});

export function hasOverlappingHours(hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const week = 7 * 1440;
  const intervals = hours.map((hour) => {
    const start = hour.dayOfWeek * 1440 + minutes(hour.startTime);
    let end = hour.dayOfWeek * 1440 + minutes(hour.endTime);
    if (end <= start) end += 1440;
    return [start, end] as const;
  });
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      for (const shift of [-week, 0, week]) {
        const shifted = [intervals[j][0] + shift, intervals[j][1] + shift];
        if (intervals[i][0] < shifted[1] && shifted[0] < intervals[i][1]) return true;
      }
    }
  }
  return false;
}

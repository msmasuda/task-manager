import { z } from "zod";

export const timeOffSchema = z.object({
  locationId: z.string().min(1),
  userId: z.string().min(1),
  startAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  endAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  type: z.enum(["BREAK", "PAID_LEAVE", "SICK_LEAVE", "OTHER"]),
  note: z.string().trim().max(200).optional().default(""),
}).refine(({ startAt, endAt }) => startAt < endAt, { message: "終了日時は開始日時より後にしてください。", path: ["endAt"] });

export function localTokyoToUtc(value: string) {
  return new Date(`${value}:00+09:00`);
}

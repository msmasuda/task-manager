import { describe, expect, it } from "vitest";
import { businessHoursSchema, hasOverlappingHours, scheduleExceptionSchema } from "./schedule";

describe("営業時間", () => {
  it("日をまたぐ営業時間を受け付ける", () => {
    expect(businessHoursSchema.safeParse({ dayOfWeek: 1, startTime: "22:00", endTime: "02:00" }).success).toBe(true);
  });

  it("同一曜日の重複を検出する", () => {
    expect(hasOverlappingHours([{ dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }, { dayOfWeek: 1, startTime: "12:00", endTime: "18:00" }])).toBe(true);
  });

  it("前日の深夜営業と翌日の営業時間の重複を検出する", () => {
    expect(hasOverlappingHours([{ dayOfWeek: 1, startTime: "22:00", endTime: "02:00" }, { dayOfWeek: 2, startTime: "01:00", endTime: "08:00" }])).toBe(true);
  });

  it("休業日は時刻なしで受け付ける", () => {
    expect(scheduleExceptionSchema.safeParse({ locationId: "location-1", date: "2026-08-10", type: "CLOSED", startTime: "", endTime: "", note: "夏季休業" }).success).toBe(true);
  });
});

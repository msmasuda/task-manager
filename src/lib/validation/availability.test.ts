import { describe, expect, it } from "vitest";
import { localTokyoToUtc, timeOffSchema } from "./availability";

describe("スタッフ休暇", () => {
  it("終了が開始より前の入力を拒否する", () => {
    expect(timeOffSchema.safeParse({ locationId: "location-1", userId: "user-1", startAt: "2026-08-10T18:00", endAt: "2026-08-10T09:00", type: "OTHER", note: "" }).success).toBe(false);
  });

  it("東京のローカル日時をUTCへ変換する", () => {
    expect(localTokyoToUtc("2026-08-10T09:00").toISOString()).toBe("2026-08-10T00:00:00.000Z");
  });
});

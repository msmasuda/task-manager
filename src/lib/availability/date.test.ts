import { describe, expect, it } from "vitest";
import { dayOfWeek, windowsForDate } from "./date";

describe("予約枠の日付変換", () => {
  it("東京時刻をUTCへ変換する", () => {
    const [window] = windowsForDate("2026-08-10", [{ startTime: "09:00", endTime: "18:00" }], []);
    expect(window.start.toISOString()).toBe("2026-08-10T00:00:00.000Z");
  });

  it("前日から日をまたぐ営業時間を含める", () => {
    const windows = windowsForDate("2026-08-11", [], [{ startTime: "22:00", endTime: "02:00" }]);
    expect(windows[0].end.toISOString()).toBe("2026-08-10T17:00:00.000Z");
  });

  it("曜日を判定する", () => {
    expect(dayOfWeek("2026-08-10")).toBe(1);
  });
});

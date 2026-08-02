import { describe, expect, it } from "vitest";
import { generateAvailableSlots, type AvailabilityInput } from "./engine";

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 10, hour, minute));
const base: AvailabilityInput = {
  openingWindows: [{ start: at(0), end: at(9) }],
  staff: [{ userId: "staff-1", windows: [{ start: at(0), end: at(9) }], unavailable: [] }],
  resourcePools: [], durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
  slotIntervalMinutes: 30, requiredStaffCount: 1,
};

describe("予約枠計算", () => {
  it("営業時間内を予約間隔で分割する", () => {
    expect(generateAvailableSlots(base)).toHaveLength(17);
  });

  it("前後バッファーを営業時間内へ収める", () => {
    const slots = generateAvailableSlots({ ...base, bufferBeforeMinutes: 15, bufferAfterMinutes: 15 });
    expect(slots[0].start).toEqual(at(0, 30));
    expect(slots.at(-1)?.start).toEqual(at(7, 30));
  });

  it("スタッフの既存予定と重なる枠を除外する", () => {
    const slots = generateAvailableSlots({ ...base, staff: [{ ...base.staff[0], unavailable: [{ start: at(1), end: at(2) }] }] });
    expect(slots.some((slot) => slot.start < at(2) && slot.end > at(1))).toBe(false);
  });

  it("必要な空き設備数を満たさない枠を除外する", () => {
    const slots = generateAvailableSlots({ ...base, resourcePools: [{ quantity: 2, resources: [{ resourceId: "room-1", unavailable: [] }] }] });
    expect(slots).toHaveLength(0);
  });

  it("必要スタッフ数を満たさない枠を除外する", () => {
    expect(generateAvailableSlots({ ...base, requiredStaffCount: 2 })).toHaveLength(0);
  });
});

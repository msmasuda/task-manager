import { describe, expect, it } from "vitest";
import { locationSettingsSchema, serviceSettingsSchema } from "./settings";

const validLocation = {
  name: "青山店", slug: "aoyama", timeZone: "Asia/Tokyo", email: "", phone: "",
  postalCode: "", address: "", slotIntervalMinutes: "15", minLeadTimeMinutes: "60",
  maxAdvanceDays: "90", bookingEnabled: false, bookingMode: "MANUAL_CONFIRM",
};

describe("店舗設定入力", () => {
  it("数値フィールドを変換する", () => {
    const result = locationSettingsSchema.parse(validLocation);
    expect(result.slotIntervalMinutes).toBe(15);
  });

  it("不正なslugを拒否する", () => {
    expect(locationSettingsSchema.safeParse({ ...validLocation, slug: "青山店" }).success).toBe(false);
  });

  it("受付可能日数の上限を検証する", () => {
    expect(locationSettingsSchema.safeParse({ ...validLocation, maxAdvanceDays: "731" }).success).toBe(false);
  });
});

describe("サービス設定入力", () => {
  const service = { locationId: "location-1", name: "初回相談", description: "", durationMinutes: "60", bufferBeforeMinutes: "0", bufferAfterMinutes: "10", priceAmount: "", requiredStaffCount: "1", color: "blue", isPublic: true, isActive: true };

  it("空の料金を未設定として扱う", () => {
    expect(serviceSettingsSchema.parse(service).priceAmount).toBeUndefined();
  });

  it("必要スタッフ数0人を拒否する", () => {
    expect(serviceSettingsSchema.safeParse({ ...service, requiredStaffCount: "0" }).success).toBe(false);
  });
});

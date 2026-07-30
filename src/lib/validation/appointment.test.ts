import { describe, expect, it } from "vitest";
import { createAppointmentSchema } from "./appointment";

const validInput = {
  organizationId: "cm12345678901234567890123",
  locationId: "cm22345678901234567890123",
  serviceId: "cm32345678901234567890123",
  customerId: "cm42345678901234567890123",
  startAt: "2026-08-01T01:00:00.000Z",
  endAt: "2026-08-01T02:00:00.000Z",
  source: "WEB" as const,
};

describe("予約入力", () => {
  it("正しい予約入力を受け付ける", () => {
    expect(createAppointmentSchema.safeParse(validInput).success).toBe(true);
  });

  it("終了日時が開始日時以前の場合は拒否する", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      endAt: validInput.startAt,
    });

    expect(result.success).toBe(false);
  });

  it("長すぎる顧客メモを拒否する", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      customerNote: "あ".repeat(1001),
    });

    expect(result.success).toBe(false);
  });
});

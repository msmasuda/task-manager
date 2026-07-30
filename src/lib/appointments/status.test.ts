import { describe, expect, it } from "vitest";
import {
  assertAppointmentTransition,
  canTransitionAppointment,
} from "./status";

describe("予約ステータス遷移", () => {
  it("確認待ちから予約確定へ変更できる", () => {
    expect(canTransitionAppointment("PENDING", "CONFIRMED")).toBe(true);
  });

  it("完了した予約を対応中へ戻せない", () => {
    expect(canTransitionAppointment("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  it("不正な遷移では説明可能なエラーを返す", () => {
    expect(() =>
      assertAppointmentTransition("CANCELLED", "CONFIRMED"),
    ).toThrow("CANCELLEDからCONFIRMEDへのステータス変更はできません。");
  });
});

import { describe, expect, it } from "vitest";
import {
  canTransitionAppointment,
  getAllowedAppointmentTransitions,
} from "./status";

describe("予約ステータス遷移", () => {
  it("確認待ちから予約確定へ変更できる", () => {
    expect(canTransitionAppointment("PENDING", "CONFIRMED")).toBe(true);
  });

  it("完了した予約を対応中へ戻せない", () => {
    expect(canTransitionAppointment("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  it("確認待ちで選択可能な遷移を返す", () => {
    expect(getAllowedAppointmentTransitions("PENDING")).toEqual(["CONFIRMED", "REJECTED", "CANCELLED"]);
  });
});

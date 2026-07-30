import { describe, expect, it } from "vitest";
import {
  assertLocationAccess,
  canAccessLocation,
  type TenantMembership,
} from "./authorization";

const staff: TenantMembership = {
  organizationId: "org-a",
  userId: "user-1",
  role: "STAFF",
  isActive: true,
  locationIds: ["location-a"],
};

describe("テナント認可", () => {
  it("スタッフは所属店舗へアクセスできる", () => {
    expect(canAccessLocation(staff, "org-a", "location-a")).toBe(true);
  });

  it("別企業の同名店舗へはアクセスできない", () => {
    expect(canAccessLocation(staff, "org-b", "location-a")).toBe(false);
  });

  it("所属外店舗へのアクセスを拒否する", () => {
    expect(() =>
      assertLocationAccess(staff, "org-a", "location-b"),
    ).toThrow("この店舗へアクセスする権限がありません。");
  });

  it("管理者は企業内の全店舗へアクセスできる", () => {
    expect(
      canAccessLocation(
        { ...staff, role: "ADMIN", locationIds: [] },
        "org-a",
        "location-b",
      ),
    ).toBe(true);
  });
});

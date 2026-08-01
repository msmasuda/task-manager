import { describe, expect, it } from "vitest";
import { acceptInvitationSchema, inviteStaffSchema, updateStaffSchema } from "./staff";

describe("スタッフ管理入力", () => {
  it("招待メールアドレスを正規化する", () => {
    expect(inviteStaffSchema.parse({ email: " STAFF@Example.COM ", role: "STAFF" }).email).toBe("staff@example.com");
  });

  it("不正な権限を拒否する", () => {
    expect(inviteStaffSchema.safeParse({ email: "staff@example.com", role: "SUPER_ADMIN" }).success).toBe(false);
  });

  it("招待承認時のパスワード一致を検証する", () => {
    expect(acceptInvitationSchema.safeParse({ token: "token", name: "山田", password: "long-password-1", passwordConfirmation: "long-password-2" }).success).toBe(false);
  });

  it("所属店舗IDの配列を受け付ける", () => {
    expect(updateStaffSchema.safeParse({ userId: "user-1", role: "STAFF", isActive: true, locationIds: ["location-1"], serviceIds: ["service-1"] }).success).toBe(true);
  });
});

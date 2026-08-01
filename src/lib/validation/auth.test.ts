import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./auth";

describe("認証入力", () => {
  it("メールアドレスを正規化する", () => {
    const result = loginSchema.parse({ email: " USER@Example.COM ", password: "secret" });
    expect(result.email).toBe("user@example.com");
  });

  it("短いパスワードを拒否する", () => {
    const result = signupSchema.safeParse({
      name: "予約 太郎", email: "user@example.com", password: "short",
      passwordConfirmation: "short", organizationName: "予約株式会社", organizationSlug: "reserve-inc",
    });
    expect(result.success).toBe(false);
  });

  it("確認用パスワードの不一致を拒否する", () => {
    const result = signupSchema.safeParse({
      name: "予約 太郎", email: "user@example.com", password: "long-password-1",
      passwordConfirmation: "long-password-2", organizationName: "予約株式会社", organizationSlug: "reserve-inc",
    });
    expect(result.success).toBe(false);
  });
});

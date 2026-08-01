import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/email/html";
import { forgotPasswordSchema, resetPasswordSchema } from "./password-reset";

describe("パスワード再設定", () => {
  it("メールアドレスを正規化する", () => {
    expect(forgotPasswordSchema.parse({ email: " USER@Example.COM " }).email).toBe("user@example.com");
  });

  it("確認用パスワードの不一致を拒否する", () => {
    expect(resetPasswordSchema.safeParse({ token: "token", password: "long-password-1", passwordConfirmation: "long-password-2" }).success).toBe(false);
  });

  it("メールHTMLへ埋め込む値をエスケープする", () => {
    expect(escapeHtml('<script>"x"</script>')).toBe("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  });
});

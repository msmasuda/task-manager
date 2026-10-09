"use server";

import { addHours } from "date-fns";
import { createToken, hashToken } from "@/lib/auth/token";
import { appUrl } from "@/lib/config/environment";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/password-reset";

export type ForgotPasswordState = { complete?: boolean; developmentUrl?: string };

export async function requestPasswordReset(_: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { complete: true };
  if (!(await rateLimit([`password-reset:ip:${await clientIp()}`, 10, 3600], [`password-reset:email:${hashToken(parsed.data.email)}`, 3, 3600]))) return { complete: true };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { complete: true };

  const token = createToken();
  const userToken = await db.$transaction(async (tx) => {
    await tx.userToken.deleteMany({ where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null } });
    return tx.userToken.create({ data: { userId: user.id, purpose: "PASSWORD_RESET", tokenHash: hashToken(token), expiresAt: addHours(new Date(), 1) } });
  });
  const url = appUrl(`/reset-password/${token}`);
  const result = await sendEmail({
    idempotencyKey: `password-reset:${userToken.id}`, recipient: user.email, template: "password-reset",
    subject: "パスワード再設定のご案内", html: `<p>${escapeHtml(user.name)} 様</p><p>次のリンクから1時間以内にパスワードを再設定してください。</p><p><a href="${escapeHtml(url)}">パスワードを再設定する</a></p><p>心当たりがない場合は、このメールを破棄してください。</p>`,
  });
  return { complete: true, ...(process.env.NODE_ENV !== "production" && !result.sent ? { developmentUrl: url } : {}) };
}

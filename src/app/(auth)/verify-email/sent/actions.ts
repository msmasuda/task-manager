"use server";

import { addHours } from "date-fns";
import { createToken, hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";
import { forgotPasswordSchema } from "@/lib/validation/password-reset";

export type VerificationState = { complete?: boolean; developmentUrl?: string };

export async function resendVerification(_: VerificationState, formData: FormData): Promise<VerificationState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { complete: true };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.emailVerifiedAt) return { complete: true };

  const token = createToken();
  const userToken = await db.$transaction(async (tx) => {
    await tx.userToken.deleteMany({ where: { userId: user.id, purpose: "EMAIL_VERIFICATION", usedAt: null } });
    return tx.userToken.create({ data: { userId: user.id, purpose: "EMAIL_VERIFICATION", tokenHash: hashToken(token), expiresAt: addHours(new Date(), 24) } });
  });
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email/${token}`;
  const result = await sendEmail({
    idempotencyKey: `email-verification:${userToken.id}`, recipient: user.email, template: "email-verification",
    subject: "メールアドレスを確認してください", html: `<p>${escapeHtml(user.name)} 様</p><p>次のリンクから24時間以内にメールアドレスを確認してください。</p><p><a href="${escapeHtml(url)}">メールアドレスを確認する</a></p>`,
  });
  return { complete: true, ...(process.env.NODE_ENV !== "production" && !result.sent ? { developmentUrl: url } : {}) };
}

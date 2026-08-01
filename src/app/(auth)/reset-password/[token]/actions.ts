"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { resetPasswordSchema } from "@/lib/validation/password-reset";

export async function resetPassword(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const userToken = await db.userToken.findFirst({
    where: { tokenHash: hashToken(parsed.data.token), purpose: "PASSWORD_RESET", usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!userToken) return { error: "再設定リンクは無効、期限切れ、または使用済みです。" };

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (tx) => {
    const claimed = await tx.userToken.updateMany({ where: { id: userToken.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("再設定リンクはすでに使用されています。");
    await tx.user.update({ where: { id: userToken.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    await tx.session.deleteMany({ where: { userId: userToken.userId } });
  });
  redirect("/login?reset=1");
}

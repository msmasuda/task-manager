"use server";

import { redirect } from "next/navigation";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";

export async function verifyEmail(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const userToken = await db.userToken.findFirst({
    where: { tokenHash: hashToken(token), purpose: "EMAIL_VERIFICATION", usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!userToken) redirect(`/verify-email/${encodeURIComponent(token)}?error=1`);
  const verified = await db.$transaction(async (tx) => {
    const claimed = await tx.userToken.updateMany({ where: { id: userToken.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: userToken.userId }, data: { emailVerifiedAt: new Date() } });
    return true;
  });
  redirect(verified ? "/login?verified=1" : `/verify-email/${encodeURIComponent(token)}?error=1`);
}

"use server";

import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { acceptInvitationSchema } from "@/lib/validation/staff";

function inviteError(token: string, message: string): never {
  redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
}

async function getInvitation(token: string) {
  return db.organizationInvitation.findFirst({
    where: { tokenHash: hashToken(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { organization: true },
  });
}

export async function acceptAsNewUser(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const parsed = acceptInvitationSchema.safeParse(Object.fromEntries(formData));
  const token = String(formData.get("token") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const invitation = await getInvitation(token);
  if (!invitation) return { error: "招待は無効、期限切れ、または承認済みです。" };
  if (await db.user.findUnique({ where: { email: invitation.email } })) return { error: "登録済みのメールアドレスです。ログインして承認してください。" };

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (tx) => {
    const claimed = await tx.organizationInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("招待はすでに処理されています。");
    const user = await tx.user.create({ data: { name: parsed.data.name, email: invitation.email, passwordHash, emailVerifiedAt: new Date() } });
    await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role } });
    await tx.auditLog.create({ data: { organizationId: invitation.organizationId, actorId: user.id, action: "staff.invitation_accepted", entityType: "OrganizationInvitation", entityId: invitation.id } });
  });
  await signIn("credentials", { email: invitation.email, password: parsed.data.password, redirect: false });
  redirect("/app");
}

export async function acceptAsExistingUser(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const session = await auth();
  if (!session?.user.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  const invitation = await getInvitation(token);
  if (!invitation) inviteError(token, "招待は無効、期限切れ、または承認済みです。");
  if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) inviteError(token, "招待先とログイン中のメールアドレスが一致しません。");

  await db.$transaction(async (tx) => {
    const claimed = await tx.organizationInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, revokedAt: null }, data: { acceptedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("招待はすでに処理されています。");
    await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: session.user.id, role: invitation.role } });
    await tx.user.update({ where: { id: session.user.id }, data: { emailVerifiedAt: new Date() } });
    await tx.auditLog.create({ data: { organizationId: invitation.organizationId, actorId: session.user.id, action: "staff.invitation_accepted", entityType: "OrganizationInvitation", entityId: invitation.id } });
  });
  redirect("/app");
}

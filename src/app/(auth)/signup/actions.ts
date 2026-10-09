"use server";

import { Prisma } from "../../../../generated/prisma/client";
import { redirect } from "next/navigation";
import { addHours } from "date-fns";
import { hashPassword } from "@/lib/auth/password";
import { createToken, hashToken } from "@/lib/auth/token";
import { appUrl } from "@/lib/config/environment";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation/auth";

export type SignupState = { error?: string };

export async function signup(_: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await rateLimit([`signup:ip:${await clientIp()}`, 5, 3600]))) return { error: "登録の試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。" };

  const { name, email, password, organizationName, organizationSlug } = parsed.data;
  if (await db.organization.findUnique({ where: { slug: organizationSlug }, select: { id: true } })) return { error: "企業URL用IDはすでに使用されています。" };
  // Respond exactly like a new signup so the form does not reveal which emails are registered.
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) redirect(`/verify-email/sent?${new URLSearchParams({ email })}`);
  const token = createToken();
  let userTokenId = "";
  try {
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash } });
      const organization = await tx.organization.create({
        data: { name: organizationName, slug: organizationSlug },
      });
      await tx.organizationMember.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
      });
      const userToken = await tx.userToken.create({
        data: { userId: user.id, purpose: "EMAIL_VERIFICATION", tokenHash: hashToken(token), expiresAt: addHours(new Date(), 24) },
      });
      userTokenId = userToken.id;
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorId: user.id,
          action: "organization.created",
          entityType: "Organization",
          entityId: organization.id,
        },
      });
    });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
      return { error: "メールアドレスまたは企業URLがすでに使用されています。" };
    }
    throw cause;
  }

  const url = appUrl(`/verify-email/${token}`);
  const result = await sendEmail({
    idempotencyKey: `email-verification:${userTokenId}`, recipient: email, template: "email-verification",
    subject: "メールアドレスを確認してください",
    html: `<p>${escapeHtml(name)} 様</p><p>次のリンクから24時間以内にメールアドレスを確認してください。</p><p><a href="${escapeHtml(url)}">メールアドレスを確認する</a></p>`,
  });
  const query = new URLSearchParams({ email });
  if (process.env.NODE_ENV !== "production" && !result.sent) query.set("developmentUrl", url);
  redirect(`/verify-email/sent?${query}`);
}

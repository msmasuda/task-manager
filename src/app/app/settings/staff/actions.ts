"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { createToken, hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";
import { inviteStaffSchema, updateStaffSchema } from "@/lib/validation/staff";

function staffError(message: string): never {
  redirect(`/app/settings/staff?error=${encodeURIComponent(message)}`);
}

export async function inviteStaff(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const parsed = inviteStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) staffError(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  if (parsed.data.role === "OWNER" && membership.role !== "OWNER") staffError("OWNERを招待できるのはOWNERだけです。");

  const existingMember = await db.organizationMember.findFirst({
    where: { organizationId: organization.id, user: { email: parsed.data.email } },
  });
  if (existingMember) staffError("このメールアドレスはすでに企業へ所属しています。");

  const token = createToken();
  const invitation = await db.$transaction(async (tx) => {
    await tx.organizationInvitation.updateMany({
      where: { organizationId: organization.id, email: parsed.data.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const invitation = await tx.organizationInvitation.create({
      data: {
        organizationId: organization.id,
        email: parsed.data.email,
        role: parsed.data.role,
        tokenHash: hashToken(token),
        invitedById: membership.userId,
        expiresAt: addDays(new Date(), 7),
      },
    });
    await tx.auditLog.create({
      data: { organizationId: organization.id, actorId: membership.userId, action: "staff.invited", entityType: "OrganizationInvitation", entityId: invitation.id },
    });
    return invitation;
  });
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/${token}`;
  const result = await sendEmail({
    organizationId: organization.id,
    idempotencyKey: `staff-invitation:${invitation.id}`,
    recipient: invitation.email,
    template: "staff-invitation",
    subject: `${organization.name}からスタッフ招待が届きました`,
    html: `<p>${escapeHtml(organization.name)}のスタッフとして招待されました。</p><p>次のリンクから7日以内に招待を承認してください。</p><p><a href="${escapeHtml(url)}">招待を承認する</a></p>`,
  });
  redirect(result.sent ? "/app/settings/staff?sent=1" : `/app/settings/staff?invitation=${encodeURIComponent(token)}`);
}

export async function revokeInvitation(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const id = String(formData.get("id") ?? "");
  const result = await db.organizationInvitation.updateMany({
    where: { id, organizationId: organization.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count !== 1) staffError("有効な招待が見つかりません。");
  await db.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: "staff.invitation_revoked", entityType: "OrganizationInvitation", entityId: id } });
  revalidatePath("/app/settings/staff");
}

export async function updateStaff(formData: FormData) {
  const { organization, membership: actor } = await requireOrganizationManager();
  const parsed = updateStaffSchema.safeParse({
    userId: formData.get("userId"), role: formData.get("role"),
    isActive: formData.get("isActive") === "on", locationIds: formData.getAll("locationIds"),
    serviceIds: formData.getAll("serviceIds"),
  });
  if (!parsed.success) staffError(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");

  const target = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId: parsed.data.userId } },
  });
  if (!target) staffError("スタッフが見つかりません。");
  if ((target.role === "OWNER" || parsed.data.role === "OWNER") && actor.role !== "OWNER") staffError("OWNERの権限を変更できるのはOWNERだけです。");

  if (target.role === "OWNER" && (parsed.data.role !== "OWNER" || !parsed.data.isActive)) {
    const ownerCount = await db.organizationMember.count({ where: { organizationId: organization.id, role: "OWNER", isActive: true } });
    if (ownerCount <= 1) staffError("企業には1人以上の有効なOWNERが必要です。");
  }

  const validLocations = await db.location.findMany({
    where: { organizationId: organization.id, id: { in: parsed.data.locationIds } }, select: { id: true },
  });
  if (validLocations.length !== new Set(parsed.data.locationIds).size) staffError("所属先に他企業の店舗が含まれています。");
  const validServices = await db.service.findMany({
    where: { organizationId: organization.id, id: { in: parsed.data.serviceIds } }, select: { id: true, locationId: true },
  });
  if (validServices.length !== new Set(parsed.data.serviceIds).size) staffError("対応サービスに他企業のデータが含まれています。");
  if (validServices.some((service) => !parsed.data.locationIds.includes(service.locationId))) staffError("所属していない店舗のサービスは設定できません。");

  await db.$transaction(async (tx) => {
    await tx.organizationMember.update({
      where: { organizationId_userId: { organizationId: organization.id, userId: target.userId } },
      data: { role: parsed.data.role, isActive: parsed.data.isActive },
    });
    await tx.locationMember.deleteMany({ where: { userId: target.userId, location: { organizationId: organization.id } } });
    if (validLocations.length) {
      await tx.locationMember.createMany({ data: validLocations.map(({ id }) => ({ locationId: id, userId: target.userId })) });
    }
    await tx.serviceStaff.deleteMany({ where: { userId: target.userId, service: { organizationId: organization.id } } });
    if (validServices.length) {
      await tx.serviceStaff.createMany({ data: validServices.map(({ id }) => ({ serviceId: id, userId: target.userId })) });
    }
    await tx.auditLog.create({
      data: { organizationId: organization.id, actorId: actor.userId, action: "staff.updated", entityType: "User", entityId: target.userId, metadata: { role: parsed.data.role, isActive: parsed.data.isActive, locationIds: parsed.data.locationIds, serviceIds: parsed.data.serviceIds } },
    });
  });
  revalidatePath("/app", "layout");
  redirect(`/app/settings/staff?edit=${target.userId}&saved=1`);
}

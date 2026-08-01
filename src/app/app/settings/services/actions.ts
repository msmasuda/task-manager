"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { serviceSettingsSchema } from "@/lib/validation/settings";

function serviceError(message: string, id?: string): never {
  const query = new URLSearchParams(id ? { edit: id, error: message } : { new: "1", error: message });
  redirect(`/app/settings/services?${query}`);
}

export async function saveService(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const raw = Object.fromEntries(formData);
  const id = typeof raw.id === "string" ? raw.id : undefined;
  const parsed = serviceSettingsSchema.safeParse({
    ...raw, id, isPublic: formData.get("isPublic") === "on", isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) serviceError(parsed.error.issues[0]?.message ?? "入力内容を確認してください。", id);
  const location = await db.location.findFirst({ where: { id: parsed.data.locationId, organizationId: organization.id }, select: { id: true } });
  if (!location) serviceError("店舗が見つかりません。", id);
  const { id: serviceId, description, ...values } = parsed.data;
  const data = { ...values, description: description || null };
  let savedId = serviceId;

  await db.$transaction(async (tx) => {
    if (serviceId) {
      const result = await tx.service.updateMany({ where: { id: serviceId, organizationId: organization.id }, data });
      if (result.count !== 1) throw new Error("サービスが見つかりません。");
    } else {
      const service = await tx.service.create({ data: { ...data, organizationId: organization.id } });
      savedId = service.id;
    }
    await tx.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: serviceId ? "service.updated" : "service.created", entityType: "Service", entityId: savedId! } });
  });
  revalidatePath("/app/settings/services");
  redirect(`/app/settings/services?edit=${savedId}&saved=1`);
}

export async function toggleService(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const id = String(formData.get("id") ?? "");
  const current = await db.service.findFirst({ where: { id, organizationId: organization.id }, select: { isActive: true } });
  if (!current) serviceError("サービスが見つかりません。", id);
  await db.$transaction([
    db.service.update({ where: { id }, data: { isActive: !current.isActive, ...(current.isActive ? { isPublic: false } : {}) } }),
    db.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: current.isActive ? "service.deactivated" : "service.activated", entityType: "Service", entityId: id } }),
  ]);
  revalidatePath("/app/settings/services");
  redirect(`/app/settings/services?edit=${id}&saved=1`);
}

"use server";

import { Prisma } from "../../../../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { resourceSchema, resourceTypeSchema, serviceRequirementSchema } from "@/lib/validation/resources";

function resourceError(message: string, edit?: string): never {
  const query = new URLSearchParams(edit ? { edit, error: message } : { error: message });
  redirect(`/app/settings/resources?${query}`);
}

export async function createResourceType(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const parsed = resourceTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) resourceError(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  try {
    const type = await db.resourceType.create({ data: { organizationId: organization.id, name: parsed.data.name } });
    await db.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: "resource_type.created", entityType: "ResourceType", entityId: type.id } });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") resourceError("同じ名前の設備種別がすでにあります。");
    throw cause;
  }
  revalidatePath("/app/settings/resources");
}

export async function saveResource(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const raw = Object.fromEntries(formData);
  const parsed = resourceSchema.safeParse({ ...raw, isActive: formData.get("isActive") === "on" });
  const id = typeof raw.id === "string" ? raw.id : undefined;
  if (!parsed.success) resourceError(parsed.error.issues[0]?.message ?? "入力内容を確認してください。", id);
  const [location, type] = await Promise.all([
    db.location.findFirst({ where: { id: parsed.data.locationId, organizationId: organization.id } }),
    db.resourceType.findFirst({ where: { id: parsed.data.resourceTypeId, organizationId: organization.id } }),
  ]);
  if (!location || !type) resourceError("店舗または設備種別が見つかりません。", id);
  const { id: resourceId, ...data } = parsed.data;
  let savedId = resourceId;
  try {
    await db.$transaction(async (tx) => {
      if (resourceId) {
        const result = await tx.resource.updateMany({ where: { id: resourceId, organizationId: organization.id }, data });
        if (result.count !== 1) throw new Error("設備が見つかりません。");
      } else {
        const resource = await tx.resource.create({ data: { ...data, organizationId: organization.id } });
        savedId = resource.id;
      }
      await tx.auditLog.create({ data: { organizationId: organization.id, locationId: location.id, actorId: membership.userId, action: resourceId ? "resource.updated" : "resource.created", entityType: "Resource", entityId: savedId! } });
    });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") resourceError("同じ店舗に同名の設備があります。", id);
    throw cause;
  }
  redirect(`/app/settings/resources?edit=${savedId}&saved=1`);
}

export async function saveServiceRequirement(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const parsed = serviceRequirementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) resourceError(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  const [service, type] = await Promise.all([
    db.service.findFirst({ where: { id: parsed.data.serviceId, organizationId: organization.id } }),
    db.resourceType.findFirst({ where: { id: parsed.data.resourceTypeId, organizationId: organization.id } }),
  ]);
  if (!service || !type) resourceError("サービスまたは設備種別が見つかりません。");
  await db.serviceResourceRequirement.upsert({
    where: { serviceId_resourceTypeId: { serviceId: service.id, resourceTypeId: type.id } },
    create: parsed.data, update: { quantity: parsed.data.quantity },
  });
  await db.auditLog.create({ data: { organizationId: organization.id, locationId: service.locationId, actorId: membership.userId, action: "service_resource_requirement.updated", entityType: "Service", entityId: service.id } });
  revalidatePath("/app/settings/resources");
}

export async function deleteServiceRequirement(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const serviceId = String(formData.get("serviceId") ?? "");
  const resourceTypeId = String(formData.get("resourceTypeId") ?? "");
  const result = await db.serviceResourceRequirement.deleteMany({ where: { serviceId, resourceTypeId, service: { organizationId: organization.id } } });
  if (result.count !== 1) resourceError("設備要件が見つかりません。");
  await db.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: "service_resource_requirement.deleted", entityType: "Service", entityId: serviceId } });
  revalidatePath("/app/settings/resources");
}

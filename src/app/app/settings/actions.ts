"use server";

import { Prisma } from "../../../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { locationSettingsSchema, organizationSettingsSchema } from "@/lib/validation/settings";

function optional(value: string) {
  return value || null;
}

export async function updateOrganization(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const parsed = organizationSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/app/settings/organization?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "入力内容を確認してください。")}`);

  try {
    await db.$transaction([
      db.organization.update({ where: { id: organization.id }, data: parsed.data }),
      db.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: "organization.updated", entityType: "Organization", entityId: organization.id } }),
    ]);
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") redirect("/app/settings/organization?error=企業URL用IDはすでに使用されています。");
    throw cause;
  }
  revalidatePath("/app", "layout");
  redirect("/app/settings/organization?saved=1");
}

export async function saveLocation(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const raw = Object.fromEntries(formData);
  const parsed = locationSettingsSchema.safeParse({ ...raw, bookingEnabled: formData.get("bookingEnabled") === "on" });
  const locationId = typeof raw.id === "string" ? raw.id : "";
  const target = locationId ? `?edit=${encodeURIComponent(locationId)}` : "?new=1";
  if (!parsed.success) redirect(`/app/settings/locations${target}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "入力内容を確認してください。")}`);

  const { id, email, phone, postalCode, address, ...values } = parsed.data;
  const data = { ...values, email: optional(email), phone: optional(phone), postalCode: optional(postalCode), address: optional(address) };
  let savedId = id;
  try {
    await db.$transaction(async (tx) => {
      if (id) {
        const result = await tx.location.updateMany({ where: { id, organizationId: organization.id }, data });
        if (result.count !== 1) throw new Error("店舗が見つかりません。");
      } else {
        const created = await tx.location.create({ data: { ...data, organizationId: organization.id } });
        savedId = created.id;
      }
      await tx.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: id ? "location.updated" : "location.created", entityType: "Location", entityId: savedId! } });
    });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") redirect(`/app/settings/locations${target}&error=店舗URL用IDは同じ企業内ですでに使用されています。`);
    throw cause;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/settings/locations?edit=${savedId}&saved=1`);
}

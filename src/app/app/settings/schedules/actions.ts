"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { businessHoursSchema, hasOverlappingHours, scheduleExceptionSchema } from "@/lib/validation/schedule";

function scheduleError(locationId: string, message: string): never {
  redirect(`/app/settings/schedules?location=${encodeURIComponent(locationId)}&error=${encodeURIComponent(message)}`);
}

async function requireLocation(organizationId: string, locationId: string) {
  const location = await db.location.findFirst({ where: { id: locationId, organizationId }, select: { id: true } });
  if (!location) scheduleError(locationId, "店舗が見つかりません。");
  return location;
}

export async function saveBusinessHours(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const locationId = String(formData.get("locationId") ?? "");
  await requireLocation(organization.id, locationId);
  const hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
  for (let day = 0; day < 7; day += 1) {
    for (let slot = 0; slot < 2; slot += 1) {
      if (formData.get(`enabled_${day}_${slot}`) !== "on") continue;
      const parsed = businessHoursSchema.safeParse({ dayOfWeek: day, startTime: formData.get(`start_${day}_${slot}`), endTime: formData.get(`end_${day}_${slot}`) });
      if (!parsed.success) scheduleError(locationId, `${day + 1}番目の曜日: ${parsed.error.issues[0]?.message}`);
      hours.push(parsed.data);
    }
  }
  if (hasOverlappingHours(hours)) scheduleError(locationId, "同じ曜日の営業時間が重複しています。");
  await db.$transaction(async (tx) => {
    await tx.businessHours.deleteMany({ where: { locationId } });
    if (hours.length) await tx.businessHours.createMany({ data: hours.map((hour) => ({ ...hour, locationId })) });
    await tx.auditLog.create({ data: { organizationId: organization.id, locationId, actorId: membership.userId, action: "business_hours.updated", entityType: "Location", entityId: locationId } });
  });
  revalidatePath("/app/settings/schedules");
  redirect(`/app/settings/schedules?location=${locationId}&saved=hours`);
}

export async function addScheduleException(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const parsed = scheduleExceptionSchema.safeParse(Object.fromEntries(formData));
  const locationId = String(formData.get("locationId") ?? "");
  if (!parsed.success) scheduleError(locationId, parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  await requireLocation(organization.id, parsed.data.locationId);
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  const values = { type: parsed.data.type, startTime: parsed.data.type === "SPECIAL_HOURS" ? parsed.data.startTime : null, endTime: parsed.data.type === "SPECIAL_HOURS" ? parsed.data.endTime : null, note: parsed.data.note || null };
  const exception = await db.locationScheduleException.upsert({
    where: { locationId_date: { locationId: parsed.data.locationId, date } },
    create: { locationId: parsed.data.locationId, date, ...values }, update: values,
  });
  await db.auditLog.create({ data: { organizationId: organization.id, locationId, actorId: membership.userId, action: "schedule_exception.created", entityType: "LocationScheduleException", entityId: exception.id } });
  revalidatePath("/app/settings/schedules");
  redirect(`/app/settings/schedules?location=${locationId}&saved=exception`);
}

export async function deleteScheduleException(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const locationId = String(formData.get("locationId") ?? "");
  const id = String(formData.get("id") ?? "");
  await requireLocation(organization.id, locationId);
  const result = await db.locationScheduleException.deleteMany({ where: { id, locationId } });
  if (result.count !== 1) scheduleError(locationId, "例外日が見つかりません。");
  await db.auditLog.create({ data: { organizationId: organization.id, locationId, actorId: membership.userId, action: "schedule_exception.deleted", entityType: "LocationScheduleException", entityId: id } });
  revalidatePath("/app/settings/schedules");
}

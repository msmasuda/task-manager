"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationManager } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { localTokyoToUtc, timeOffSchema } from "@/lib/validation/availability";
import { businessHoursSchema, hasOverlappingHours } from "@/lib/validation/schedule";

function availabilityError(userId: string, locationId: string, message: string): never {
  redirect(`/app/settings/staff-availability?user=${encodeURIComponent(userId)}&location=${encodeURIComponent(locationId)}&error=${encodeURIComponent(message)}`);
}

async function requireAssignment(organizationId: string, userId: string, locationId: string) {
  const membership = await db.locationMember.findFirst({ where: { userId, locationId, location: { organizationId } } });
  if (!membership) availabilityError(userId, locationId, "スタッフはこの店舗に所属していません。");
}

export async function saveStaffSchedule(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const userId = String(formData.get("userId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  await requireAssignment(organization.id, userId, locationId);
  const schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
  for (let day = 0; day < 7; day += 1) {
    for (let slot = 0; slot < 2; slot += 1) {
      if (formData.get(`enabled_${day}_${slot}`) !== "on") continue;
      const parsed = businessHoursSchema.safeParse({ dayOfWeek: day, startTime: formData.get(`start_${day}_${slot}`), endTime: formData.get(`end_${day}_${slot}`) });
      if (!parsed.success) availabilityError(userId, locationId, parsed.error.issues[0]?.message ?? "勤務時刻を確認してください。");
      schedules.push(parsed.data);
    }
  }
  if (hasOverlappingHours(schedules)) availabilityError(userId, locationId, "勤務時間が重複しています。");
  await db.$transaction(async (tx) => {
    await tx.staffSchedule.deleteMany({ where: { userId, locationId } });
    if (schedules.length) await tx.staffSchedule.createMany({ data: schedules.map((schedule) => ({ ...schedule, userId, locationId })) });
    await tx.auditLog.create({ data: { organizationId: organization.id, locationId, actorId: membership.userId, action: "staff_schedule.updated", entityType: "User", entityId: userId } });
  });
  revalidatePath("/app/settings/staff-availability");
  redirect(`/app/settings/staff-availability?user=${userId}&location=${locationId}&saved=schedule`);
}

export async function addTimeOff(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const parsed = timeOffSchema.safeParse(Object.fromEntries(formData));
  const userId = String(formData.get("userId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  if (!parsed.success) availabilityError(userId, locationId, parsed.error.issues[0]?.message ?? "日時を確認してください。");
  await requireAssignment(organization.id, parsed.data.userId, parsed.data.locationId);
  const timeOff = await db.staffTimeOff.create({ data: { userId: parsed.data.userId, locationId: parsed.data.locationId, startAt: localTokyoToUtc(parsed.data.startAt), endAt: localTokyoToUtc(parsed.data.endAt), type: parsed.data.type, note: parsed.data.note || null } });
  await db.auditLog.create({ data: { organizationId: organization.id, locationId, actorId: membership.userId, action: "staff_time_off.created", entityType: "StaffTimeOff", entityId: timeOff.id } });
  revalidatePath("/app/settings/staff-availability");
  redirect(`/app/settings/staff-availability?user=${userId}&location=${locationId}&saved=timeoff`);
}

export async function deleteTimeOff(formData: FormData) {
  const { organization, membership } = await requireOrganizationManager();
  const id = String(formData.get("id") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  await requireAssignment(organization.id, userId, locationId);
  const result = await db.staffTimeOff.deleteMany({ where: { id, userId, locationId } });
  if (result.count !== 1) availabilityError(userId, locationId, "休暇・休憩が見つかりません。");
  await db.auditLog.create({ data: { organizationId: organization.id, locationId, actorId: membership.userId, action: "staff_time_off.deleted", entityType: "StaffTimeOff", entityId: id } });
  revalidatePath("/app/settings/staff-availability");
}

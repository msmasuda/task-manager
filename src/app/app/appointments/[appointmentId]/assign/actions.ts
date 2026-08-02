"use server";

import { Prisma } from "../../../../../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppointmentAccess } from "@/lib/appointments/access";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";

export async function assignAppointmentStaff(formData: FormData) {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const primaryUserId = String(formData.get("primaryUserId") ?? "");
  const { appointment, organization, membership } = await requireAppointmentAccess(appointmentId);
  if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(appointment.status)) redirect(`/app/appointments/${appointmentId}/assign?error=この状態の予約は担当変更できません。`);
  const date = appointment.startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = await findInternalAvailability({ organizationId: organization.id, locationId: appointment.locationId, serviceId: appointment.serviceId, date, excludeAppointmentId: appointment.id });
  const slot = availability?.slots.find((item) => item.start.getTime() === appointment.startAt.getTime());
  if (!availability || !slot || !slot.availableStaffIds.includes(primaryUserId)) redirect(`/app/appointments/${appointmentId}/assign?error=選択したスタッフはこの予約を担当できません。`);
  const userIds = [primaryUserId, ...slot.availableStaffIds.filter((id) => id !== primaryUserId)].slice(0, availability.service.requiredStaffCount);
  if (userIds.length < availability.service.requiredStaffCount) redirect(`/app/appointments/${appointmentId}/assign?error=必要な担当人数を確保できません。`);

  try {
    await db.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({ where: { id: appointment.id, version: appointment.version, status: appointment.status }, data: { preferredStaffId: primaryUserId, version: { increment: 1 } } });
      if (result.count !== 1) throw new Error("予約が更新されています。");
      await tx.appointmentAssignment.deleteMany({ where: { appointmentId: appointment.id } });
      await tx.appointmentAssignment.createMany({ data: userIds.map((userId, index) => ({ appointmentId: appointment.id, userId, type: index ? "SUPPORT" : "PRIMARY", occupancyStartAt: appointment.occupancyStartAt, occupancyEndAt: appointment.occupancyEndAt, assignedById: membership.userId })) });
      await tx.auditLog.create({ data: { organizationId: organization.id, locationId: appointment.locationId, actorId: membership.userId, action: "appointment.staff_assigned", entityType: "Appointment", entityId: appointment.id, metadata: { userIds } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    redirect(`/app/appointments/${appointmentId}/assign?error=担当変更が競合しました。再度お試しください。`);
  }
  revalidatePath(`/app/appointments/${appointment.id}`);
  redirect(`/app/appointments/${appointment.id}?saved=1`);
}

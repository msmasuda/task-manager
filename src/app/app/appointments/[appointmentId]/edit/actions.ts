"use server";

import { Prisma } from "../../../../../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppointmentAccess } from "@/lib/appointments/access";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";

export async function rescheduleAppointment(formData: FormData) {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const startValue = String(formData.get("startAt") ?? "");
  const { appointment, organization, membership } = await requireAppointmentAccess(appointmentId);
  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) redirect(`/app/appointments/${appointmentId}/edit?error=この状態の予約は日時変更できません。`);
  const startAt = new Date(startValue);
  if (Number.isNaN(startAt.getTime())) redirect(`/app/appointments/${appointmentId}/edit?error=日時を選択してください。`);
  const date = startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = await findInternalAvailability({ organizationId: organization.id, locationId: appointment.locationId, serviceId: appointment.serviceId, date, excludeAppointmentId: appointment.id });
  const slot = availability?.slots.find((item) => item.start.getTime() === startAt.getTime());
  if (!availability || !slot) redirect(`/app/appointments/${appointmentId}/edit?date=${date}&error=選択した枠は利用できません。`);

  try {
    await db.$transaction(async (tx) => {
      const current = await tx.appointment.updateMany({ where: { id: appointment.id, version: appointment.version, status: appointment.status }, data: { startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd, version: { increment: 1 } } });
      if (current.count !== 1) throw new Error("予約が更新されています。");
      await tx.appointmentAssignment.deleteMany({ where: { appointmentId: appointment.id } });
      await tx.resourceReservation.deleteMany({ where: { appointmentId: appointment.id } });
      await tx.appointmentAssignment.createMany({ data: slot.availableStaffIds.slice(0, availability.service.requiredStaffCount).map((userId, index) => ({ appointmentId: appointment.id, userId, type: index ? "SUPPORT" : "PRIMARY", occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd, assignedById: membership.userId })) });
      for (const requirement of availability.service.resourceRequirements) {
        const resources = await tx.resource.findMany({ where: { organizationId: organization.id, locationId: appointment.locationId, resourceTypeId: requirement.resourceTypeId, isActive: true, reservations: { none: { appointmentId: { not: appointment.id }, occupancyStartAt: { lt: slot.occupancyEnd }, occupancyEndAt: { gt: slot.occupancyStart } } } }, orderBy: { id: "asc" }, take: requirement.quantity });
        if (resources.length < requirement.quantity) throw new Error("設備を確保できませんでした。");
        await tx.resourceReservation.createMany({ data: resources.map((resource) => ({ appointmentId: appointment.id, resourceId: resource.id, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd })) });
      }
      await tx.auditLog.create({ data: { organizationId: organization.id, locationId: appointment.locationId, actorId: membership.userId, action: "appointment.rescheduled", entityType: "Appointment", entityId: appointment.id, metadata: { from: appointment.startAt.toISOString(), to: slot.start.toISOString() } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    redirect(`/app/appointments/${appointmentId}/edit?date=${date}&error=予約が競合しました。空き状況を再確認してください。`);
  }
  revalidatePath(`/app/appointments/${appointment.id}`);
  redirect(`/app/appointments/${appointment.id}?saved=1`);
}

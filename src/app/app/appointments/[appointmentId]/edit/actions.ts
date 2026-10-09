"use server";

import { Prisma } from "../../../../../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppointmentAccess } from "@/lib/appointments/access";
import { reserveSlot } from "@/lib/appointments/reserve";
import { findInternalAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import { emailDateTime, escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";

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
      await reserveSlot(tx, appointment.id, availability.service, slot, { assignedById: membership.userId, preferredUserId: appointment.preferredStaffId });
      await tx.auditLog.create({ data: { organizationId: organization.id, locationId: appointment.locationId, actorId: membership.userId, action: "appointment.rescheduled", entityType: "Appointment", entityId: appointment.id, metadata: { from: appointment.startAt.toISOString(), to: slot.start.toISOString() } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    redirect(`/app/appointments/${appointmentId}/edit?date=${date}&error=予約が競合しました。空き状況を再確認してください。`);
  }
  const customer = await db.customer.findUnique({ where: { id: appointment.customerId } });
  if (customer?.email) {
    await sendEmail({ organizationId: organization.id, idempotencyKey: `appointment-rescheduled:${appointment.id}:${appointment.version + 1}`, recipient: customer.email, template: "appointment-rescheduled", subject: "予約日時が変更されました", html: `<p>${escapeHtml(customer.name)} 様</p><p>${escapeHtml(appointment.serviceNameSnapshot)}のご予約日時を、店舗にて${emailDateTime(slot.start)}へ変更しました。</p>` });
  }
  revalidatePath(`/app/appointments/${appointment.id}`);
  redirect(`/app/appointments/${appointment.id}?saved=1`);
}

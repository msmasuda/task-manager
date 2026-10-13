"use server";

import type { AppointmentStatus } from "../../../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppointmentAccess } from "@/lib/appointments/access";
import { canTransitionAppointment } from "@/lib/appointments/status";
import { db } from "@/lib/db/client";
import { emailDateTime, escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";

export async function updateAppointmentStatus(formData: FormData) {
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const toStatus = String(formData.get("status") ?? "") as AppointmentStatus;
  const reason = String(formData.get("reason") ?? "").trim();
  const requestedReturnTo = String(formData.get("returnTo") ?? "");
  const returnTo = requestedReturnTo.startsWith("/app/board") ? requestedReturnTo : `/app/appointments/${appointmentId}?saved=1`;
  const { appointment, membership, organization } = await requireAppointmentAccess(appointmentId);
  if (!canTransitionAppointment(appointment.status, toStatus)) redirect(`/app/appointments/${appointmentId}?error=許可されていないステータス変更です。`);

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.appointment.updateMany({
      where: { id: appointment.id, organizationId: organization.id, version: appointment.version, status: appointment.status },
      data: { status: toStatus, version: { increment: 1 }, ...(toStatus === "CANCELLED" ? { cancelledAt: new Date(), cancellationReason: reason || "店舗によるキャンセル" } : {}) },
    });
    if (result.count !== 1) return false;
    if (toStatus === "CANCELLED" || toStatus === "REJECTED") {
      await tx.appointmentAssignment.deleteMany({ where: { appointmentId: appointment.id } });
      await tx.resourceReservation.deleteMany({ where: { appointmentId: appointment.id } });
    }
    await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, fromStatus: appointment.status, toStatus, changedById: membership.userId } });
    await tx.auditLog.create({ data: { organizationId: organization.id, locationId: appointment.locationId, actorId: membership.userId, action: "appointment.status_updated", entityType: "Appointment", entityId: appointment.id, metadata: { from: appointment.status, to: toStatus, reason } } });
    return true;
  });
  if (!updated) redirect(`/app/appointments/${appointmentId}?error=予約が他の操作で更新されています。内容を確認して再度お試しください。`);
  const customer = await db.customer.findUnique({ where: { id: appointment.customerId } });
  if (customer?.email && ["CONFIRMED", "REJECTED", "CANCELLED"].includes(toStatus)) {
    const label = toStatus === "CONFIRMED" ? "予約が確定しました" : toStatus === "REJECTED" ? "予約をお受けできませんでした" : "予約をキャンセルしました";
    await sendEmail({ organizationId: organization.id, idempotencyKey: `appointment-status:${appointment.id}:${toStatus}:${appointment.version + 1}`, recipient: customer.email, template: "appointment-status", subject: label, html: `<p>${escapeHtml(customer.name)} 様</p><p>${escapeHtml(appointment.serviceNameSnapshot)}について、${escapeHtml(label)}。</p><p>日時: ${emailDateTime(appointment.startAt)}</p>` });
  }
  revalidatePath("/app/appointments");
  redirect(returnTo);
}

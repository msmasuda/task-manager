"use server";

import { redirect } from "next/navigation";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";

export async function cancelPublicAppointment(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const appointment = await db.appointment.findUnique({ where: { managementTokenHash: hashToken(token) }, include: { location: true, customer: true } });
  if (!appointment || !["PENDING", "CONFIRMED"].includes(appointment.status)) redirect(`/appointment/${encodeURIComponent(token)}?error=cancel`);
  const deadline = new Date(appointment.startAt.getTime() - (appointment.location.cancellationDeadlineMinutes ?? 0) * 60_000);
  if (new Date() >= deadline) redirect(`/appointment/${encodeURIComponent(token)}?error=deadline`);

  await db.$transaction(async (tx) => {
    const result = await tx.appointment.updateMany({
      where: { id: appointment.id, version: appointment.version, status: appointment.status },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason || "顧客によるキャンセル", version: { increment: 1 } },
    });
    if (result.count !== 1) throw new Error("予約が更新されています。");
    await tx.appointmentAssignment.deleteMany({ where: { appointmentId: appointment.id } });
    await tx.resourceReservation.deleteMany({ where: { appointmentId: appointment.id } });
    await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, fromStatus: appointment.status, toStatus: "CANCELLED" } });
    await tx.auditLog.create({ data: { organizationId: appointment.organizationId, locationId: appointment.locationId, action: "appointment.cancelled_by_customer", entityType: "Appointment", entityId: appointment.id, metadata: { reason } } });
  });
  if (appointment.customer.email) {
    await sendEmail({ organizationId: appointment.organizationId, idempotencyKey: `appointment-cancelled:${appointment.id}`, recipient: appointment.customer.email, template: "appointment-cancelled", subject: "予約をキャンセルしました", html: `<p>${escapeHtml(appointment.customer.name)} 様</p><p>${escapeHtml(appointment.serviceNameSnapshot)}の予約をキャンセルしました。</p><p>日時: ${escapeHtml(new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(appointment.startAt))}</p>` });
  }
  redirect(`/appointment/${token}?cancelled=1`);
}

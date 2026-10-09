"use server";

import { Prisma } from "../../../../../generated/prisma/client";
import { redirect } from "next/navigation";
import { reserveSlot } from "@/lib/appointments/reserve";
import { findPublicAvailability } from "@/lib/availability/query";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";

export async function changePublicAppointment(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const startValue = String(formData.get("startAt") ?? "");
  const appointment = await db.appointment.findUnique({ where: { managementTokenHash: hashToken(token) }, include: { location: { include: { organization: true } }, customer: true } });
  if (!appointment || !["PENDING", "CONFIRMED"].includes(appointment.status)) redirect(`/appointment/${encodeURIComponent(token)}/change?error=この予約は日時変更できません。`);
  const deadline = new Date(appointment.startAt.getTime() - (appointment.location.cancellationDeadlineMinutes ?? 0) * 60_000);
  if (new Date() >= deadline) redirect(`/appointment/${encodeURIComponent(token)}/change?error=変更受付期限を過ぎています。`);
  const startAt = new Date(startValue);
  if (Number.isNaN(startAt.getTime())) redirect(`/appointment/${encodeURIComponent(token)}/change?error=日時を選択してください。`);
  const date = startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = await findPublicAvailability({ organizationSlug: appointment.location.organization.slug, locationSlug: appointment.location.slug, serviceId: appointment.serviceId, date, excludeAppointmentId: appointment.id });
  const slot = availability?.slots.find((item) => item.start.getTime() === startAt.getTime());
  if (!availability || !slot) redirect(`/appointment/${token}/change?date=${date}&error=選択した枠は利用できません。`);

  // Approval-required locations re-approve a customer's new time.
  const nextStatus = appointment.location.bookingMode === "MANUAL_CONFIRM" ? "PENDING" : appointment.status;
  try {
    await db.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({ where: { id: appointment.id, version: appointment.version, status: appointment.status }, data: { status: nextStatus, startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd, version: { increment: 1 } } });
      if (result.count !== 1) throw new Error("予約が更新されています。");
      if (nextStatus !== appointment.status) await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, fromStatus: appointment.status, toStatus: nextStatus } });
      await reserveSlot(tx, appointment.id, availability.service, slot, { preferredUserId: appointment.preferredStaffId });
      await tx.auditLog.create({ data: { organizationId: appointment.organizationId, locationId: appointment.locationId, action: "appointment.rescheduled_by_customer", entityType: "Appointment", entityId: appointment.id, metadata: { from: appointment.startAt.toISOString(), to: slot.start.toISOString() } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    redirect(`/appointment/${token}/change?date=${date}&error=予約が競合しました。空き状況を再確認してください。`);
  }
  if (appointment.customer.email) {
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/appointment/${token}`;
    await sendEmail({ organizationId: appointment.organizationId, idempotencyKey: `appointment-rescheduled:${appointment.id}:${appointment.version + 1}`, recipient: appointment.customer.email, template: "appointment-rescheduled", subject: nextStatus === "PENDING" ? "予約日時の変更を受け付けました" : "予約日時を変更しました", html: `<p>${escapeHtml(appointment.customer.name)} 様</p><p>予約日時を${escapeHtml(new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(slot.start))}へ変更しました。${nextStatus === "PENDING" ? "店舗が確認後、確定のご連絡をお送りします。" : ""}</p><p><a href="${escapeHtml(url)}">予約内容を確認する</a></p>` });
  }
  redirect(`/appointment/${token}?changed=1`);
}

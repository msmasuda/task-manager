"use server";

import { Prisma } from "../../../../../generated/prisma/client";
import { redirect } from "next/navigation";
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

  try {
    await db.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({ where: { id: appointment.id, version: appointment.version, status: appointment.status }, data: { startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd, version: { increment: 1 } } });
      if (result.count !== 1) throw new Error("予約が更新されています。");
      await tx.appointmentAssignment.deleteMany({ where: { appointmentId: appointment.id } });
      await tx.resourceReservation.deleteMany({ where: { appointmentId: appointment.id } });
      await tx.appointmentAssignment.createMany({ data: slot.availableStaffIds.slice(0, availability.service.requiredStaffCount).map((userId, index) => ({ appointmentId: appointment.id, userId, type: index ? "SUPPORT" : "PRIMARY", occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd })) });
      for (const requirement of availability.service.resourceRequirements) {
        const resources = await tx.resource.findMany({ where: { organizationId: appointment.organizationId, locationId: appointment.locationId, resourceTypeId: requirement.resourceTypeId, isActive: true, reservations: { none: { appointmentId: { not: appointment.id }, occupancyStartAt: { lt: slot.occupancyEnd }, occupancyEndAt: { gt: slot.occupancyStart } } } }, orderBy: { id: "asc" }, take: requirement.quantity });
        if (resources.length < requirement.quantity) throw new Error("設備を確保できませんでした。");
        await tx.resourceReservation.createMany({ data: resources.map((resource) => ({ appointmentId: appointment.id, resourceId: resource.id, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd })) });
      }
      await tx.auditLog.create({ data: { organizationId: appointment.organizationId, locationId: appointment.locationId, action: "appointment.rescheduled_by_customer", entityType: "Appointment", entityId: appointment.id, metadata: { from: appointment.startAt.toISOString(), to: slot.start.toISOString() } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    redirect(`/appointment/${token}/change?date=${date}&error=予約が競合しました。空き状況を再確認してください。`);
  }
  if (appointment.customer.email) {
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/appointment/${token}`;
    await sendEmail({ organizationId: appointment.organizationId, idempotencyKey: `appointment-rescheduled:${appointment.id}:${appointment.version + 1}`, recipient: appointment.customer.email, template: "appointment-rescheduled", subject: "予約日時を変更しました", html: `<p>${escapeHtml(appointment.customer.name)} 様</p><p>予約日時を${escapeHtml(new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(slot.start))}へ変更しました。</p><p><a href="${escapeHtml(url)}">予約内容を確認する</a></p>` });
  }
  redirect(`/appointment/${token}?changed=1`);
}

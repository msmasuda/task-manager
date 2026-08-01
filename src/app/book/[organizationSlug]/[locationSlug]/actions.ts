"use server";

import { Prisma } from "../../../../../generated/prisma/client";
import { redirect } from "next/navigation";
import { createToken, hashToken } from "@/lib/auth/token";
import { findPublicAvailability } from "@/lib/availability/query";
import { db } from "@/lib/db/client";
import { escapeHtml } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";
import { publicBookingSchema } from "@/lib/validation/appointment";

function bookingUrl(org: string, location: string, service: string, startAt: string, error: string) {
  const date = new Date(startAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  return `/book/${org}/${location}?service=${encodeURIComponent(service)}&date=${date}&start=${encodeURIComponent(startAt)}&error=${encodeURIComponent(error)}`;
}

export async function createPublicBooking(formData: FormData) {
  const parsed = publicBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(bookingUrl(String(formData.get("organizationSlug")), String(formData.get("locationSlug")), String(formData.get("serviceId")), String(formData.get("startAt")), parsed.error.issues[0]?.message ?? "入力内容を確認してください。"));
  const { organizationSlug, locationSlug, serviceId, customerName, customerEmail, customerPhone, customerNote } = parsed.data;
  const startAt = new Date(parsed.data.startAt);
  const date = startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = await findPublicAvailability({ organizationSlug, locationSlug, serviceId, date });
  const slot = availability?.slots.find((item) => item.start.getTime() === startAt.getTime());
  if (!availability || !slot) redirect(bookingUrl(organizationSlug, locationSlug, serviceId, parsed.data.startAt, "選択した枠は利用できなくなりました。別の時間を選択してください。"));
  const managementToken = createToken();
  let appointmentId = "";

  try {
    await db.$transaction(async (tx) => {
      const service = availability.service;
      let customer = await tx.customer.findFirst({ where: { organizationId: service.organizationId, email: customerEmail } });
      customer ??= await tx.customer.create({ data: { organizationId: service.organizationId, name: customerName, email: customerEmail, phone: customerPhone || null } });
      const appointment = await tx.appointment.create({ data: {
        organizationId: service.organizationId, locationId: service.locationId, serviceId: service.id, customerId: customer.id,
        status: service.location.bookingMode === "AUTO_CONFIRM" ? "CONFIRMED" : "PENDING", source: "WEB",
        startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd,
        serviceNameSnapshot: service.name, durationMinutesSnapshot: service.durationMinutes, priceAmountSnapshot: service.priceAmount,
        currencySnapshot: service.currency, customerNote, managementTokenHash: hashToken(managementToken),
      } });
      appointmentId = appointment.id;
      const assignedStaff = slot.availableStaffIds.slice(0, service.requiredStaffCount);
      await tx.appointmentAssignment.createMany({ data: assignedStaff.map((userId, index) => ({ appointmentId: appointment.id, userId, type: index === 0 ? "PRIMARY" : "SUPPORT", occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd })) });
      for (const requirement of service.resourceRequirements) {
        const candidates = await tx.resource.findMany({
          where: { organizationId: service.organizationId, locationId: service.locationId, resourceTypeId: requirement.resourceTypeId, isActive: true, reservations: { none: { occupancyStartAt: { lt: slot.occupancyEnd }, occupancyEndAt: { gt: slot.occupancyStart }, appointment: { status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] } } } } },
          orderBy: { id: "asc" }, take: requirement.quantity,
        });
        if (candidates.length < requirement.quantity) throw new Error("必要な設備を確保できませんでした。");
        await tx.resourceReservation.createMany({ data: candidates.map((resource) => ({ appointmentId: appointment.id, resourceId: resource.id, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd })) });
      }
      await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, toStatus: appointment.status } });
      await tx.auditLog.create({ data: { organizationId: service.organizationId, locationId: service.locationId, action: "appointment.created_public", entityType: "Appointment", entityId: appointment.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    redirect(bookingUrl(organizationSlug, locationSlug, serviceId, parsed.data.startAt, "予約が競合しました。空き状況を再確認してください。"));
  }
  const appointmentUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/appointment/${managementToken}`;
  await sendEmail({
    organizationId: availability.service.organizationId,
    idempotencyKey: `appointment-created:${appointmentId}`,
    recipient: customerEmail,
    template: "appointment-created",
    subject: availability.service.location.bookingMode === "AUTO_CONFIRM" ? "予約が確定しました" : "予約を受け付けました",
    html: `<p>${escapeHtml(customerName)} 様</p><p>${escapeHtml(availability.service.name)}の予約を受け付けました。</p><p>日時: ${escapeHtml(new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(slot.start))}</p><p><a href="${escapeHtml(appointmentUrl)}">予約内容を確認する</a></p>`,
  });
  redirect(`/appointment/${managementToken}?created=1`);
}

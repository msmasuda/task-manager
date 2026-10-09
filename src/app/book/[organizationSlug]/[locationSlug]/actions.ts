"use server";

import { Prisma } from "../../../../../generated/prisma/client";
import { redirect } from "next/navigation";
import { reserveSlot } from "@/lib/appointments/reserve";
import { createToken, hashToken } from "@/lib/auth/token";
import { findPublicAvailability } from "@/lib/availability/query";
import { clientIp, rateLimit } from "@/lib/rate-limit";
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
  if (!(await rateLimit([`booking:ip:${await clientIp()}`, 10, 3600]))) redirect(bookingUrl(organizationSlug, locationSlug, serviceId, parsed.data.startAt, "予約の送信回数が上限に達しました。しばらく時間をおいてから再度お試しください。"));
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
      // Anyone can type any email here, so only reuse a customer record when the name matches too.
      let customer = await tx.customer.findFirst({ where: { organizationId: service.organizationId, email: customerEmail, name: customerName } });
      customer ??= await tx.customer.create({ data: { organizationId: service.organizationId, name: customerName, email: customerEmail, phone: customerPhone || null } });
      const appointment = await tx.appointment.create({ data: {
        organizationId: service.organizationId, locationId: service.locationId, serviceId: service.id, customerId: customer.id,
        status: service.location.bookingMode === "AUTO_CONFIRM" ? "CONFIRMED" : "PENDING", source: "WEB",
        startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd,
        serviceNameSnapshot: service.name, durationMinutesSnapshot: service.durationMinutes, priceAmountSnapshot: service.priceAmount,
        currencySnapshot: service.currency, customerNote, managementTokenHash: hashToken(managementToken),
      } });
      appointmentId = appointment.id;
      await reserveSlot(tx, appointment.id, service, slot);
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

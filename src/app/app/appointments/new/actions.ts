"use server";

import { Prisma } from "../../../../../generated/prisma/client";
import { redirect } from "next/navigation";
import { getAppointmentAccessContext } from "@/lib/appointments/access";
import { findInternalAvailability } from "@/lib/availability/query";
import { createToken, hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";
import { staffBookingSchema } from "@/lib/validation/appointment";

function newBookingError(locationId: string, serviceId: string, startAt: string, message: string): never {
  const date = startAt ? new Date(startAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }) : "";
  const query = new URLSearchParams({ location: locationId, service: serviceId, date, start: startAt, error: message });
  redirect(`/app/appointments/new?${query}`);
}

export async function createStaffBooking(formData: FormData) {
  const parsed = staffBookingSchema.safeParse(Object.fromEntries(formData));
  const locationId = String(formData.get("locationId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startValue = String(formData.get("startAt") ?? "");
  if (!parsed.success) newBookingError(locationId, serviceId, startValue, parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  const context = await getAppointmentAccessContext();
  if (context.locationIds && !context.locationIds.includes(parsed.data.locationId)) newBookingError(locationId, serviceId, startValue, "店舗へのアクセス権限がありません。");
  const startAt = new Date(parsed.data.startAt);
  const date = startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const availability = await findInternalAvailability({ organizationId: context.organization.id, locationId: parsed.data.locationId, serviceId: parsed.data.serviceId, date });
  const slot = availability?.slots.find((item) => item.start.getTime() === startAt.getTime());
  if (!availability || !slot) newBookingError(locationId, serviceId, startValue, "選択した枠は利用できません。空き状況を再確認してください。");
  let appointmentId = "";
  try {
    await db.$transaction(async (tx) => {
      const service = availability.service;
      let customer = parsed.data.customerEmail ? await tx.customer.findFirst({ where: { organizationId: context.organization.id, email: parsed.data.customerEmail } }) : null;
      customer ??= await tx.customer.create({ data: { organizationId: context.organization.id, name: parsed.data.customerName, email: parsed.data.customerEmail || null, phone: parsed.data.customerPhone || null } });
      const appointment = await tx.appointment.create({ data: { organizationId: context.organization.id, locationId: service.locationId, serviceId: service.id, customerId: customer.id, status: "CONFIRMED", source: parsed.data.source, startAt: slot.start, endAt: slot.end, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd, serviceNameSnapshot: service.name, durationMinutesSnapshot: service.durationMinutes, priceAmountSnapshot: service.priceAmount, currencySnapshot: service.currency, customerNote: parsed.data.customerNote, internalNote: parsed.data.internalNote, managementTokenHash: hashToken(createToken()), createdById: context.membership.userId } });
      appointmentId = appointment.id;
      await tx.appointmentAssignment.createMany({ data: slot.availableStaffIds.slice(0, service.requiredStaffCount).map((userId, index) => ({ appointmentId: appointment.id, userId, type: index ? "SUPPORT" : "PRIMARY", occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd, assignedById: context.membership.userId })) });
      for (const requirement of service.resourceRequirements) {
        const resources = await tx.resource.findMany({ where: { organizationId: context.organization.id, locationId: service.locationId, resourceTypeId: requirement.resourceTypeId, isActive: true, reservations: { none: { occupancyStartAt: { lt: slot.occupancyEnd }, occupancyEndAt: { gt: slot.occupancyStart }, appointment: { status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] } } } } }, orderBy: { id: "asc" }, take: requirement.quantity });
        if (resources.length < requirement.quantity) throw new Error("設備を確保できませんでした。");
        await tx.resourceReservation.createMany({ data: resources.map((resource) => ({ appointmentId: appointment.id, resourceId: resource.id, occupancyStartAt: slot.occupancyStart, occupancyEndAt: slot.occupancyEnd })) });
      }
      await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, toStatus: "CONFIRMED", changedById: context.membership.userId } });
      await tx.auditLog.create({ data: { organizationId: context.organization.id, locationId: service.locationId, actorId: context.membership.userId, action: "appointment.created_by_staff", entityType: "Appointment", entityId: appointment.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    newBookingError(locationId, serviceId, startValue, "予約が競合しました。空き状況を再確認してください。");
  }
  redirect(`/app/appointments/${appointmentId}?created=1`);
}

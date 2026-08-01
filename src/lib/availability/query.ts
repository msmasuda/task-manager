import { addMinutes, differenceInCalendarDays } from "date-fns";
import type { Prisma } from "../../../generated/prisma/client";
import { db } from "@/lib/db/client";
import { dayOfWeek, localDateTime, previousDate, windowsForDate } from "./date";
import { generateAvailableSlots } from "./engine";

const blockingStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] as const;
type LoadedService = Prisma.ServiceGetPayload<{ include: {
  location: true;
  staff: { include: { user: { select: { id: true } } } };
  resourceRequirements: true;
} }>;

async function calculateAvailability(service: LoadedService, date: string, excludeAppointmentId?: string) {
  const requestedDate = new Date(`${date}T00:00:00+09:00`);
  const today = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }) + "T00:00:00+09:00");
  const daysAhead = differenceInCalendarDays(requestedDate, today);
  if (daysAhead < 0 || daysAhead > service.location.maxAdvanceDays) return { service, slots: [] };

  const currentDay = dayOfWeek(date);
  const previousDay = dayOfWeek(previousDate(date));
  const [hours, exception] = await Promise.all([
    db.businessHours.findMany({ where: { locationId: service.locationId, dayOfWeek: { in: [currentDay, previousDay] } } }),
    db.locationScheduleException.findUnique({ where: { locationId_date: { locationId: service.locationId, date: new Date(`${date}T00:00:00.000Z`) } } }),
  ]);
  let openingWindows = windowsForDate(date, hours.filter((hour) => hour.dayOfWeek === currentDay), hours.filter((hour) => hour.dayOfWeek === previousDay));
  if (exception?.type === "CLOSED") openingWindows = [];
  if (exception?.type === "SPECIAL_HOURS" && exception.startTime && exception.endTime) {
    openingWindows = [{ start: localDateTime(date, exception.startTime), end: localDateTime(date, exception.endTime, exception.endTime <= exception.startTime) }];
  }

  const rangeStart = localDateTime(previousDate(date), "00:00");
  const rangeEnd = localDateTime(date, "23:59", true);
  const eligibleUserIds = service.staff.map(({ userId }) => userId);
  const [schedules, timeOffs, assignments, resources, reservations] = await Promise.all([
    db.staffSchedule.findMany({ where: { locationId: service.locationId, userId: { in: eligibleUserIds }, dayOfWeek: { in: [currentDay, previousDay] } } }),
    db.staffTimeOff.findMany({ where: { locationId: service.locationId, userId: { in: eligibleUserIds }, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } } }),
    db.appointmentAssignment.findMany({ where: { userId: { in: eligibleUserIds }, occupancyStartAt: { lt: rangeEnd }, occupancyEndAt: { gt: rangeStart }, appointmentId: excludeAppointmentId ? { not: excludeAppointmentId } : undefined, appointment: { status: { in: [...blockingStatuses] }, locationId: service.locationId } } }),
    db.resource.findMany({ where: { locationId: service.locationId, isActive: true, resourceTypeId: { in: service.resourceRequirements.map(({ resourceTypeId }) => resourceTypeId) } } }),
    db.resourceReservation.findMany({ where: { resource: { locationId: service.locationId }, appointmentId: excludeAppointmentId ? { not: excludeAppointmentId } : undefined, occupancyStartAt: { lt: rangeEnd }, occupancyEndAt: { gt: rangeStart }, appointment: { status: { in: [...blockingStatuses] } } } }),
  ]);
  const staff = eligibleUserIds.map((userId) => ({
    userId,
    windows: windowsForDate(date, schedules.filter((item) => item.userId === userId && item.dayOfWeek === currentDay), schedules.filter((item) => item.userId === userId && item.dayOfWeek === previousDay)),
    unavailable: [...timeOffs.filter((item) => item.userId === userId).map((item) => ({ start: item.startAt, end: item.endAt })), ...assignments.filter((item) => item.userId === userId).map((item) => ({ start: item.occupancyStartAt, end: item.occupancyEndAt }))],
  }));
  const resourcePools = service.resourceRequirements.map((requirement) => ({
    quantity: requirement.quantity,
    resources: resources.filter((resource) => resource.resourceTypeId === requirement.resourceTypeId).map((resource) => ({ resourceId: resource.id, unavailable: reservations.filter((item) => item.resourceId === resource.id).map((item) => ({ start: item.occupancyStartAt, end: item.occupancyEndAt })) })),
  }));
  const leadTimeStart = addMinutes(new Date(), service.location.minLeadTimeMinutes);
  const requestedDayStart = localDateTime(date, "00:00");
  const earliestStart = leadTimeStart > requestedDayStart ? leadTimeStart : requestedDayStart;
  return { service, slots: generateAvailableSlots({ openingWindows, staff, resourcePools, durationMinutes: service.durationMinutes, bufferBeforeMinutes: service.bufferBeforeMinutes, bufferAfterMinutes: service.bufferAfterMinutes, slotIntervalMinutes: service.location.slotIntervalMinutes, requiredStaffCount: service.requiredStaffCount, earliestStart }) };
}

export async function findPublicAvailability(input: { organizationSlug: string; locationSlug: string; serviceId: string; date: string; excludeAppointmentId?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
  const service = await db.service.findFirst({
    where: { id: input.serviceId, isActive: true, isPublic: true, organization: { slug: input.organizationSlug }, location: { slug: input.locationSlug, bookingEnabled: true, organization: { slug: input.organizationSlug } } },
    include: {
      location: true,
      staff: { where: { isPubliclyBookable: true, user: { memberships: { some: { organization: { slug: input.organizationSlug }, isActive: true } }, locationMemberships: { some: { location: { slug: input.locationSlug, organization: { slug: input.organizationSlug } } } } } }, include: { user: { select: { id: true } } } },
      resourceRequirements: true,
    },
  });
  if (!service || service.location.timeZone !== "Asia/Tokyo") return null;
  return calculateAvailability(service, input.date, input.excludeAppointmentId);
}

export async function findInternalAvailability(input: { organizationId: string; locationId: string; serviceId: string; date: string; excludeAppointmentId?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
  const service = await db.service.findFirst({
    where: { id: input.serviceId, organizationId: input.organizationId, locationId: input.locationId, isActive: true },
    include: {
      location: true,
      staff: { where: { user: { memberships: { some: { organizationId: input.organizationId, isActive: true } }, locationMemberships: { some: { locationId: input.locationId } } } }, include: { user: { select: { id: true } } } },
      resourceRequirements: true,
    },
  });
  if (!service || service.location.timeZone !== "Asia/Tokyo") return null;
  return calculateAvailability(service, input.date, input.excludeAppointmentId);
}
